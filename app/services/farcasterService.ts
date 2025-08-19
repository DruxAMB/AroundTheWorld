export interface FarcasterProfile {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  verifiedAddresses: string[];
}

class FarcasterService {
  private readonly NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  private readonly BASE_URL = 'https://api.neynar.com/v2/farcaster';
  
  async getUserByFid(fid: number): Promise<FarcasterProfile | null> {
    if (!this.NEYNAR_API_KEY) {
      console.warn('NEYNAR_API_KEY not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.BASE_URL}/user/bulk?fids=${fid}`, {
        headers: {
          'accept': 'application/json',
          'api_key': this.NEYNAR_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const user = data.users?.[0];
      
      if (!user) {
        return null;
      }

      return {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name || user.username,
        pfpUrl: user.pfp_url || '',
        bio: user.profile?.bio?.text || '',
        followerCount: user.follower_count || 0,
        followingCount: user.following_count || 0,
        verifiedAddresses: user.verified_addresses?.eth_addresses || [],
      };
    } catch (error) {
      console.error(`Failed to fetch Farcaster profile for FID ${fid}:`, error);
      return null;
    }
  }

  async getUsersByFids(fids: number[]): Promise<Record<number, FarcasterProfile>> {
    if (!this.NEYNAR_API_KEY || fids.length === 0) {
      return {};
    }

    try {
      // Neynar API supports up to 100 FIDs per request
      const chunks = this.chunkArray(fids, 100);
      const results: Record<number, FarcasterProfile> = {};

      for (const chunk of chunks) {
        const response = await fetch(`${this.BASE_URL}/user/bulk?fids=${chunk.join(',')}`, {
          headers: {
            'accept': 'application/json',
            'api_key': this.NEYNAR_API_KEY,
          },
        });

        if (!response.ok) {
          console.error(`HTTP error! status: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.users) {
          for (const user of data.users) {
            results[user.fid] = {
              fid: user.fid,
              username: user.username,
              displayName: user.display_name || user.username,
              pfpUrl: user.pfp_url || '',
              bio: user.profile?.bio?.text || '',
              followerCount: user.follower_count || 0,
              followingCount: user.following_count || 0,
              verifiedAddresses: user.verified_addresses?.eth_addresses || [],
            };
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to fetch Farcaster profiles:', error);
      return {};
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const farcasterService = new FarcasterService();
