let accessToken = null;
let tokenExpiration = null; 

// Function to fetch a new access token
async function fetchAccessToken() {

    const url = 'https://accounts.spotify.com/api/token'
    const authOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')),
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      })
    };

    const response = await fetch(url, authOptions);

    if (!response.ok) {
        throw new Error('Failed to fetch access token');
    }

    const data = await response.json();
    accessToken = data.access_token;

    // Set the expiration time
    const expiresIn = data.expires_in * 1000; 
    tokenExpiration = Date.now() + expiresIn;

    console.log({
      message: 'Updated spotify access_token',
      access_token: accessToken
    })

    return accessToken;
}

function isTokenExpired() {
    return !accessToken || Date.now() >= tokenExpiration;
}

export async function fetchSpotify(url, options = {}) {

    if (isTokenExpired()) {
        await fetchAccessToken();
    }

    options.headers = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch(url, options);
    
    // If the response indicates the token is invalid
    if (response.status === 401) {
        await fetchAccessToken();

        // Retry the original request with the new token
        options.headers.Authorization = `Bearer ${accessToken}`;
        return fetch(url, options);
    }

    return response;
}