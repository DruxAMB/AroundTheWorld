# Redis Setup for Around The World

This project uses Redis for storing user data and leaderboard information. Follow these instructions to set up Redis for your local development environment.

## Environment Variables

Add the following environment variables to your `.env` file:

```
# Redis Configuration
REDIS_URL=your_redis_url_here
REDIS_TOKEN=your_redis_token_here
```

## Using Upstash Redis

This project is configured to use [Upstash Redis](https://upstash.com/), a serverless Redis service that's perfect for Next.js applications.

1. Create a free account at [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Go to the "REST API" section and copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Add these values to your `.env` file as `REDIS_URL` and `REDIS_TOKEN` respectively

## Redis Data Structure

The application uses the following Redis data structures:

### Leaderboard

- Uses a sorted set with the key `leaderboard`
- Each entry contains a player's address, score, level, and timestamp
- Scores are sorted in descending order

### User Data

- Uses a hash with the key pattern `user:{address}`
- Stores information such as highest level, highest score, games played, etc.

### User Score History

- Uses a sorted set with the key pattern `user_scores:{address}`
- Tracks a user's score history over time

## Testing Redis Locally

You can also run Redis locally using Docker:

```bash
docker run -p 6379:6379 --name around-the-world-redis -d redis
```

Then update your `.env` file to use the local Redis instance:

```
REDIS_URL=redis://localhost:6379
REDIS_TOKEN=
```

## Redis Functions

The application provides the following Redis functionality:

1. **Leaderboard Management**
   - Adding scores to the leaderboard
   - Retrieving top scores
   - Getting a user's rank

2. **User Data Management**
   - Storing user progress
   - Retrieving user data
   - Tracking score history

3. **API Endpoints**
   - `/api/leaderboard` - GET and POST endpoints for leaderboard data
   - `/api/user` - GET and POST endpoints for user data
