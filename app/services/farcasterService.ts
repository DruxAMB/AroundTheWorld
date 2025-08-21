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
      return this.createFallbackProfile(fid);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${this.BASE_URL}/user/bulk?fids=${fid}`, {
        headers: {
          'accept': 'application/json',
          'api_key': this.NEYNAR_API_KEY,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited by Neynar API, using fallback profile');
          return this.createFallbackProfile(fid);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const user = data.users?.[0];
      
      if (!user) {
        return this.createFallbackProfile(fid);
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
      return this.createFallbackProfile(fid);
    }
  }

  async getUsersByFids(fids: number[]): Promise<Record<number, FarcasterProfile>> {
    if (!this.NEYNAR_API_KEY || fids.length === 0) {
      // Return fallback profiles for all FIDs if no API key
      const fallbackProfiles: Record<number, FarcasterProfile> = {};
      if (!this.NEYNAR_API_KEY) {
        for (const fid of fids) {
          const fallback = this.createFallbackProfile(fid);
          if (fallback) {
            fallbackProfiles[fid] = fallback;
          }
        }
      }
      return fallbackProfiles;
    }

    try {
      // Neynar API supports up to 100 FIDs per request
      const chunks = this.chunkArray(fids, 100);
      const results: Record<number, FarcasterProfile> = {};

      for (const chunk of chunks) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for bulk

          const response = await fetch(`${this.BASE_URL}/user/bulk?fids=${chunk.join(',')}`, {
            headers: {
              'accept': 'application/json',
              'api_key': this.NEYNAR_API_KEY,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 429) {
              console.warn('Rate limited by Neynar API, using fallback profiles for chunk');
              // Add fallback profiles for this chunk
              for (const fid of chunk) {
                const fallback = this.createFallbackProfile(fid);
                if (fallback) {
                  results[fid] = fallback;
                }
              }
              continue;
            }
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

          // Add fallback profiles for any FIDs not returned by the API
          for (const fid of chunk) {
            if (!results[fid]) {
              const fallback = this.createFallbackProfile(fid);
              if (fallback) {
                results[fid] = fallback;
              }
            }
          }
        } catch (chunkError) {
          console.error('Error processing chunk:', chunkError);
          // Add fallback profiles for failed chunk
          for (const fid of chunk) {
            const fallback = this.createFallbackProfile(fid);
            if (fallback) {
              results[fid] = fallback;
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to fetch Farcaster profiles:', error);
      // Return fallback profiles for all requested FIDs
      const fallbackProfiles: Record<number, FarcasterProfile> = {};
      for (const fid of fids) {
        const fallback = this.createFallbackProfile(fid);
        if (fallback) {
          fallbackProfiles[fid] = fallback;
        }
      }
      return fallbackProfiles;
    }
  }

  private createFallbackProfile(fid: number): FarcasterProfile | null {
    return {
      fid,
      username: `user${fid}`,
      displayName: `User ${fid}`,
      pfpUrl: '',
      bio: '',
      followerCount: 0,
      followingCount: 0,
      verifiedAddresses: [],
    };
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
