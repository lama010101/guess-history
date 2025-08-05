/**
 * Avatar System and Submission Cues for Multiplayer
 * Handles avatar display, submission notifications, and visual feedback
 */

export interface AvatarData {
  id: string;
  name: string;
  avatar: string;
  isReady: boolean;
  hasSubmitted: boolean;
  submissionTime?: number;
}

export interface SubmissionCue {
  playerId: string;
  playerName: string;
  round: number;
  timestamp: number;
}

export class AvatarManager {
  private avatars: Map<string, AvatarData> = new Map();
  private submissionCues: SubmissionCue[] = [];
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  /**
   * Update player avatar data
   */
  updateAvatar(playerId: string, data: Partial<AvatarData>): void {
    const existing = this.avatars.get(playerId);
    const updated = { ...existing, ...data, id: playerId };
    this.avatars.set(playerId, updated);
    this.emit('avatar-updated', { playerId, avatar: updated });
  }

  /**
   * Record submission cue
   */
  recordSubmission(playerId: string, playerName: string, round: number): void {
    const cue: SubmissionCue = {
      playerId,
      playerName,
      round,
      timestamp: Date.now(),
    };

    this.submissionCues.push(cue);
    this.emit('submission-cue', cue);

    // Remove cue after 5 seconds
    setTimeout(() => {
      this.removeSubmissionCue(cue);
    }, 5000);
  }

  /**
   * Get all avatars
   */
  getAvatars(): AvatarData[] {
    return Array.from(this.avatars.values());
  }

  /**
   * Get submission cues for display
   */
  getSubmissionCues(): SubmissionCue[] {
    return [...this.submissionCues];
  }

  /**
   * Remove submission cue
   */
  private removeSubmissionCue(cue: SubmissionCue): void {
    const index = this.submissionCues.findIndex(
      c => c.playerId === cue.playerId && c.timestamp === cue.timestamp
    );
    if (index > -1) {
      this.submissionCues.splice(index, 1);
      this.emit('submission-cue-removed', cue);
    }
  }

  /**
   * Listen for avatar updates
   */
  onAvatarUpdate(callback: (data: any) => void): () => void {
    return this.on('avatar-updated', callback);
  }

  /**
   * Listen for submission cues
   */
  onSubmissionCue(callback: (data: any) => void): () => void {
    return this.on('submission-cue', callback);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.avatars.clear();
    this.submissionCues = [];
    this.listeners.clear();
  }

  private on(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(callback);

    return () => {
      const callbacks = this.listeners.get(type);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private emit(type: string, data: any): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

/**
 * React hook for avatar system
 */
import { useEffect, useState } from 'react';

export function useAvatarSystem() {
  const [avatarManager] = useState(() => new AvatarManager());
  const [avatars, setAvatars] = useState<AvatarData[]>([]);
  const [submissionCues, setSubmissionCues] = useState<SubmissionCue[]>([]);

  useEffect(() => {
    const unsubscribeAvatar = avatarManager.onAvatarUpdate((data) => {
      setAvatars(avatarManager.getAvatars());
    });

    const unsubscribeSubmission = avatarManager.onSubmissionCue((data) => {
      setSubmissionCues(avatarManager.getSubmissionCues());
    });

    // Initial load
    setAvatars(avatarManager.getAvatars());
    setSubmissionCues(avatarManager.getSubmissionCues());

    return () => {
      unsubscribeAvatar();
      unsubscribeSubmission();
    };
  }, [avatarManager]);

  return {
    avatarManager,
    avatars,
    submissionCues,
    updateAvatar: avatarManager.updateAvatar.bind(avatarManager),
    recordSubmission: avatarManager.recordSubmission.bind(avatarManager),
  };
}

/**
 * Utility functions for avatar display
 */
export function getAvatarUrl(avatar: string): string {
  if (avatar.startsWith('http')) return avatar;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatar)}`;
}

export function formatSubmissionCue(cue: SubmissionCue): string {
  const timeAgo = Date.now() - cue.timestamp;
  if (timeAgo < 1000) return 'Just now';
  if (timeAgo < 60000) return `${Math.floor(timeAgo / 1000)}s ago`;
  return `${Math.floor(timeAgo / 60000)}m ago`;
}
