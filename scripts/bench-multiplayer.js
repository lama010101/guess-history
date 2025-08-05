#!/usr/bin/env node

/**
 * Multiplayer Latency Benchmark Script
 * Tests RTT, reconnection, and async deadline processing
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

class MultiplayerBenchmark {
  constructor(options = {}) {
    this.rooms = options.rooms || 20;
    this.players = options.players || 5;
    this.duration = options.duration || 180; // seconds
    this.baseURL = options.baseURL || 'ws://localhost:1999';
    this.supabaseURL = options.supabaseURL || 'http://localhost:54321';
    this.results = {
      rooms: [],
      players: [],
      latencies: [],
      reconnections: [],
      deadlines: []
    };
  }

  async run() {
    console.log(`🚀 Starting multiplayer benchmark...`);
    console.log(`Rooms: ${this.rooms}, Players: ${this.players}, Duration: ${this.duration}s`);

    // Create test rooms
    const roomIds = await this.createTestRooms();
    console.log(`Created ${roomIds.length} test rooms`);

    // Run latency tests
    await this.runLatencyTests(roomIds);

    // Run reconnection tests
    await this.runReconnectionTests(roomIds);

    // Run deadline processing tests
    await this.runDeadlineTests(roomIds);

    // Generate report
    return this.generateReport();
  }

  async createTestRooms() {
    const roomIds = [];
    
    for (let i = 0; i < this.rooms; i++) {
      // Create invite via API
      const response = await fetch(`${this.supabaseURL}/functions/v1/create-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'async' })
      });
      
      const { inviteId } = await response.json();
      roomIds.push(inviteId);
    }
    
    return roomIds;
  }

  async runLatencyTests(roomIds) {
    console.log('📊 Running latency tests...');
    
    const testPromises = roomIds.map(async (roomId) => {
      const players = [];
      
      for (let i = 0; i < this.players; i++) {
        const player = await this.createPlayer(roomId, `player-${i}`);
        players.push(player);
      }
      
      // Measure RTT for each player
      const latencyTests = players.map(async (player) => {
        const start = Date.now();
        await player.send('PING', { timestamp: start });
        
        return new Promise((resolve) => {
          player.on('PONG', (data) => {
            const latency = Date.now() - data.timestamp;
            this.results.latencies.push({
              roomId,
              playerId: player.id,
              latency,
              timestamp: Date.now()
            });
            resolve(latency);
          });
        });
      });
      
      const latencies = await Promise.all(latencyTests);
      
      // Cleanup
      players.forEach(p => p.disconnect());
      
      return {
        roomId,
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p95Latency: this.calculatePercentile(latencies, 0.95),
        p99Latency: this.calculatePercentile(latencies, 0.99)
      };
    });
    
    this.results.rooms = await Promise.all(testPromises);
  }

  async runReconnectionTests(roomIds) {
    console.log('🔄 Testing reconnection...');
    
    const reconnectionTests = roomIds.slice(0, 5).map(async (roomId) => {
      const player = await this.createPlayer(roomId, 'reconnection-test');
      
      // Measure reconnection time
      const start = Date.now();
      player.disconnect();
      
      const reconnected = await this.waitForReconnection(player, roomId);
      const reconnectionTime = Date.now() - start;
      
      this.results.reconnections.push({
        roomId,
        reconnectionTime,
        success: reconnected
      });
      
      player.disconnect();
    });
    
    await Promise.all(reconnectionTests);
  }

  async runDeadlineTests(roomIds) {
    console.log('⏰ Testing deadline processing...');
    
    const deadlineTests = roomIds.slice(0, 3).map(async (roomId) => {
      // Create room with short deadline
      const player = await this.createPlayer(roomId, 'deadline-test');
      
      // Submit some guesses
      await player.send('PLAYER_MOVE', { round: 1, guess: { lat: 0, lng: 0 } });
      
      // Wait for deadline processing
      const deadlineProcessed = await this.waitForDeadline(player);
      
      this.results.deadlines.push({
        roomId,
        deadlineProcessed,
        timestamp: Date.now()
      });
      
      player.disconnect();
    });
    
    await Promise.all(deadlineTests);
  }

  async createPlayer(roomId, playerId) {
    const ws = new WebSocket(`${this.baseURL}/parties/main/${roomId}`);
    
    return new Promise((resolve) => {
      ws.on('open', () => {
        const player = {
          id: playerId,
          ws,
          send: (type, data) => {
            ws.send(JSON.stringify({ type, data }));
          },
          on: (event, callback) => {
            ws.on('message', (data) => {
              const message = JSON.parse(data.toString());
              if (message.type === event) {
                callback(message.data);
              }
            });
          },
          disconnect: () => {
            ws.close();
          }
        };
        resolve(player);
      });
    });
  }

  async waitForReconnection(player, roomId) {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkConnection = async () => {
        if (attempts >= maxAttempts) {
          resolve(false);
          return;
        }
        
        try {
          const newPlayer = await this.createPlayer(roomId, player.id);
          resolve(true);
          newPlayer.disconnect();
        } catch {
          attempts++;
          setTimeout(checkConnection, 1000);
        }
      };
      
      checkConnection();
    });
  }

  async waitForDeadline(player) {
    return new Promise((resolve) => {
      player.on('ROUND_COMPLETE', () => {
        resolve(true);
      });
      
      setTimeout(() => resolve(false), 30000); // 30 second timeout
    });
  }

  calculatePercentile(arr, percentile) {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  generateReport() {
    const latencies = this.results.latencies.map(l => l.latency);
    const reconnections = this.results.reconnections;
    const deadlines = this.results.deadlines;

    return {
      summary: {
        totalRooms: this.rooms,
        totalPlayers: this.players,
        duration: this.duration,
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p95Latency: this.calculatePercentile(latencies, 95),
        p99Latency: this.calculatePercentile(latencies, 99),
        reconnectionSuccessRate: reconnections.filter(r => r.success).length / reconnections.length,
        deadlineProcessingRate: deadlines.filter(d => d.deadlineProcessed).length / deadlines.length
      },
      detailed: this.results,
      recommendations: this.generateRecommendations(latencies, reconnections, deadlines)
    };
  }

  generateRecommendations(latencies, reconnections, deadlines) {
    const recommendations = [];
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    if (avgLatency > 100) {
      recommendations.push('Consider implementing lag compensation for high-latency players');
    }
    
    const reconnectionRate = reconnections.filter(r => r.success).length / reconnections.length;
    if (reconnectionRate < 0.95) {
      recommendations.push('Improve reconnection reliability - consider exponential backoff');
    }
    
    const deadlineRate = deadlines.filter(d => d.deadlineProcessed).length / deadlines.length;
    if (deadlineRate < 0.98) {
      recommendations.push('Review cron job reliability for deadline processing');
    }
    
    return recommendations;
  }
}

// CLI interface
if (require.main === module) {
  const benchmark = new MultiplayerBenchmark({
    rooms: parseInt(process.env.ROOMS) || 20,
    players: parseInt(process.env.PLAYERS) || 5,
    duration: parseInt(process.env.DURATION) || 180,
    baseURL: process.env.PARTYKIT_URL || 'ws://localhost:1999',
    supabaseURL: process.env.SUPABASE_URL || 'http://localhost:54321'
  });

  benchmark.run().then(report => {
    console.log('\n📊 Multiplayer Benchmark Results');
    console.log('================================');
    console.log(`Average Latency: ${report.summary.avgLatency.toFixed(2)}ms`);
    console.log(`P95 Latency: ${report.summary.p95Latency.toFixed(2)}ms`);
    console.log(`P99 Latency: ${report.summary.p99Latency.toFixed(2)}ms`);
    console.log(`Reconnection Success: ${(report.summary.reconnectionSuccessRate * 100).toFixed(1)}%`);
    console.log(`Deadline Processing: ${(report.summary.deadlineProcessingRate * 100).toFixed(1)}%`);
    console.log('\n📋 Recommendations:');
    report.recommendations.forEach(rec => console.log(`- ${rec}`));
    
    // Save report to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(`benchmark-${timestamp}.json`, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to benchmark-${timestamp}.json`);
  }).catch(console.error);
}

module.exports = MultiplayerBenchmark;
