# End-to-End QA Playbook

## Pre-Test Setup

### Environment Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
INVITE_HMAC_SECRET=your-hmac-secret
PARTYKIT_URL=ws://localhost:1999
PARTYKIT_DASH_KEY=your-partykit-dash-key
```

### Test Accounts
- **Test User 1**: `test1@example.com` / `password123`
- **Test User 2**: `test2@example.com` / `password123`
- **Test User 3**: `test3@example.com` / `password123`

### Test URLs
- **Local**: `http://localhost:5173`
- **PartyKit**: `ws://localhost:1999`
- **Invite API**: `http://localhost:54321/functions/v1/create-invite`

## Test Scenarios

### 1. Basic Connection Flow
**Test**: Single player joins room
**Steps**:
1. Generate invite link via API
2. Open invite link in browser
3. Verify connection established
4. Check avatar appears in lobby
5. Verify state sync works

**Expected**: Player appears in lobby, state updates
**Pass**: ✅ / ❌

### 2. Multi-Device Testing
**Test**: 3 players join same room
**Devices**: Chrome, Firefox, Safari, Mobile Safari
**Steps**:
1. Create room with 3 invite links
2. Each player joins from different device
3. Verify all players see each other
4. Test simultaneous actions

**Expected**: All devices sync correctly
**Pass**: ✅ / ❌

### 3. Reconnection Testing
**Test**: Network interruption and recovery
**Steps**:
1. Player joins room
2. Disconnect network for 30 seconds
3. Reconnect network
4. Verify automatic reconnection
5. Check state preservation

**Expected**: Player reconnects automatically, state restored
**Pass**: ✅ / ❌

### 4. Invite Link Reuse
**Test**: Same invite link used multiple times
**Steps**:
1. Create invite link
2. Player 1 joins via link
3. Player 2 joins via same link
4. Player 1 disconnects
5. Player 3 joins via same link

**Expected**: All players can use same link
**Pass**: ✅ / ❌

### 5. Rate Limiting
**Test**: Abuse prevention triggers
**Steps**:
1. Rapidly create 25 invites from same IP
2. Verify 21st+ request is blocked
3. Wait 1 minute and retry
4. Verify rate limit resets

**Expected**: 429 error after 20 requests
**Pass**: ✅ / ❌

### 6. State Persistence
**Test**: Room hibernation and wake
**Steps**:
1. Create room with 2 players
2. Both players disconnect
3. Wait 2 minutes
4. Reconnect with new player
5. Verify state restored

**Expected**: Previous state available
**Pass**: ✅ / ❌

### 7. Async Deadline Processing
**Test**: Automatic round completion
**Steps**:
1. Create async room with 5-minute deadline
2. Players join and submit guesses
3. Wait for deadline
4. Verify round completion
5. Check leaderboard update

**Expected**: Round completes automatically
**Pass**: ✅ / ❌

### 8. Leaderboard Accuracy
**Test**: Score calculations
**Steps**:
1. Submit known test data
2. Verify score calculations
3. Check ranking updates
4. Test tie-breakers

**Expected**: Accurate scoring and ranking
**Pass**: ✅ / ❌

### 9. Avatar Display
**Test**: Avatar rendering across devices
**Steps**:
1. Upload custom avatars
2. Test on mobile/desktop
3. Check loading states
4. Verify fallback avatars

**Expected**: Avatars display correctly
**Pass**: ✅ / ❌

### 10. Error Handling
**Test**: Graceful error states
**Steps**:
1. Force network errors
2. Test invalid JWT
3. Test expired invite
4. Verify error messages

**Expected**: Clear error messages
**Pass**: ✅ / ❌

## Test Scripts

### Automated Tests
```bash
# Run all tests
npm run test:e2e

# Run specific test suite
npm run test:e2e:connection
npm run test:e2e:multiplayer
npm run test:e2e:reconnection
```

### Manual Test Script
```bash
# Start services
npm run dev &
npm run partykit:dev &

# Run test scenarios
./scripts/test-connection.sh
./scripts/test-reconnection.sh
./scripts/test-rate-limit.sh
```

## Performance Benchmarks

### Connection Metrics
- **Connection time**: < 2 seconds
- **Reconnection time**: < 5 seconds
- **State sync latency**: < 100ms
- **Message throughput**: > 100 messages/second

### Load Testing
- **Concurrent users**: 50+ players
- **Room capacity**: 10+ players per room
- **Memory usage**: < 100MB per room
- **CPU usage**: < 10% per room

## Browser Compatibility

### Tested Browsers
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+
- [ ] Mobile Safari iOS 14+
- [ ] Chrome Android 90+

### Mobile Testing
- [ ] iPhone 12 (iOS 14+)
- [ ] Samsung Galaxy S21 (Android 11+)
- [ ] iPad Pro (iOS 14+)
- [ ] Pixel 5 (Android 11+)

## Network Conditions

### Tested Networks
- [ ] WiFi (100ms latency)
- [ ] 4G (200ms latency)
- [ ] 3G (500ms latency)
- [ ] 2G (1000ms latency)
- [ ] Airplane mode (disconnection)

### Bandwidth Testing
- [ ] High bandwidth (100Mbps+)
- [ ] Medium bandwidth (10Mbps)
- [ ] Low bandwidth (1Mbps)
- [ ] Variable bandwidth

## Edge Cases

### 1. Rapid Reconnection
- Connect/disconnect 10 times in 30 seconds
- Verify no memory leaks
- Check state consistency

### 2. Large Payloads
- Submit 1000+ character messages
- Verify no truncation
- Check performance impact

### 3. Concurrent Updates
- 10 players submit simultaneously
- Verify no race conditions
- Check leaderboard accuracy

### 4. Invalid Data
- Submit malformed JSON
- Verify error handling
- Check graceful degradation

## Monitoring Setup

### Metrics to Track
- Connection success rate
- Reconnection success rate
- Message delivery rate
- Error rate
- Average latency
- P95/P99 latencies

### Logging
- All connection events
- State changes
- Error states
- Performance metrics

### Alerts
- Error rate > 1%
- P95 latency > 350ms
- Connection failure rate > 5%
- Reconnection failure rate > 10%

## Test Results Template

| Test Case | Browser | Device | Network | Result | Notes |
|-----------|---------|--------|---------|--------|-------|
| Basic Connection | Chrome | Desktop | WiFi | ✅ | - |
| Multi-Device | Safari | iPhone | 4G | ✅ | - |
| Reconnection | Firefox | Desktop | WiFi | ✅ | - |
| Rate Limiting | Chrome | Desktop | WiFi | ✅ | - |
| State Persistence | Chrome | Desktop | WiFi | ✅ | - |
| Async Deadline | Chrome | Desktop | WiFi | ✅ | - |
| Leaderboard | Chrome | Desktop | WiFi | ✅ | - |
| Avatar Display | Safari | iPhone | 4G | ✅ | - |
| Error Handling | Chrome | Desktop | WiFi | ✅ | - |

## Issue Tracking

### Known Issues
- [ ] Issue #1: Description
- [ ] Issue #2: Description

### Bug Report Template
```markdown
**Browser**: [Browser name and version]
**Device**: [Device name]
**Network**: [Network type]
**Steps to reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected behavior**:
[What should happen]

**Actual behavior**:
[What actually happens]

**Screenshots**:
[If applicable]

**Logs**:
```
[Console logs]
```
```

## Release Checklist

### Pre-release
- [ ] All automated tests passing
- [ ] Manual test scenarios completed
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated

### Release
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Performance testing
- [ ] Load testing
- [ ] Security testing

### Post-release
- [ ] Monitor for 24 hours
- [ ] Check error rates
- [ ] Verify metrics
- [ ] User feedback collection
