const REGION = 'us-west-2';
const CREDENTIALS = {
    accessKeyId: '',
    secretAccessKey: ''
}
const CP_ENDPOINT = 'https://kinesisvideo.us-west-2.amazonaws.com';
const CHANNEL_NAME = 'test-channel';
const CLIENT_ID = 'test-client';

const RUN_DELAY_MS = 1000;
setInterval(RUN_DELAY_MS, () => {
    run().then()
});

// Create KVS client
const kinesisVideoClient = new AWS.KinesisVideo({
    region: REGION,
    accessKeyId: CREDENTIALS.accessKeyId,
    secretAccessKey: CREDENTIALS.secretAccessKey,
    endpoint: CP_ENDPOINT,
});

async function run() {

    // Get signaling channel ARN
    const describeSignalingChannelResponse = await kinesisVideoClient
        .describeSignalingChannel({
            ChannelName: CHANNEL_NAME, // Maybe use a non-constant here? You can also create the stream here by calling createSignalingChannel
        })
        .promise();
    const channelARN = describeSignalingChannelResponse.ChannelInfo.ChannelARN;

    // Get signaling channel endpoints
    const getSignalingChannelEndpointResponse = await kinesisVideoClient
        .getSignalingChannelEndpoint({
            ChannelARN: channelARN,
            SingleMasterChannelEndpointConfiguration: {
                Protocols: ['WSS', 'HTTPS'],
                Role: KVSWebRTC.Role.VIEWER,
            },
        })
        .promise();
    const endpointsByProtocol = getSignalingChannelEndpointResponse.ResourceEndpointList.reduce((endpoints, endpoint) => {
        endpoints[endpoint.Protocol] = endpoint.ResourceEndpoint;
        return endpoints;
    }, {});

    const kinesisVideoSignalingChannelsClient = new AWS.KinesisVideoSignalingChannels({
        region: REGION,
        accessKeyId: CREDENTIALS.accessKeyId,
        secretAccessKey: CREDENTIALS.secretAccessKey,
        endpoint: endpointsByProtocol.HTTPS,
    });

    // Get ICE server configuration
    const getIceServerConfigResponse = await kinesisVideoSignalingChannelsClient
        .getIceServerConfig({
            ChannelARN: channelARN,
        })
        .promise();
    const iceServers = [];
    iceServers.push({ urls: `stun:stun.kinesisvideo.${REGION}.amazonaws.com:443` });
    if (!formValues.natTraversalDisabled) {
        getIceServerConfigResponse.IceServerList.forEach(iceServer =>
            iceServers.push({
                urls: iceServer.Uris,
                username: iceServer.Username,
                credential: iceServer.Password,
            }),
        );
    }

    // Create Signaling Client
    const signalingClient = new KVSWebRTC.SignalingClient({
        channelARN,
        channelEndpoint: endpointsByProtocol.WSS,
        clientId: CLIENT_ID,
        role: KVSWebRTC.Role.VIEWER,
        region: REGION,
        credentials: CREDENTIALS,
    });

    signalingClient.on('open', async () => {
        console.log('[VIEWER] Connected to signaling service');

        const offer = ''; // Create mock offer
        signalingClient.sendSdpOffer(offer);
        
        const iceCandidates = []; // Create mock ice candidates
        iceCandidates.forEach((candidate) => {
            signalingClient.sendIceCandidate(candidate);
        });
    });

    signalingClient.on('sdpAnswer', async answer => {
        console.log('[VIEWER] Received SDP answer');
    });

    signalingClient.on('iceCandidate', candidate => {
        console.log('[VIEWER] Received ICE candidate');
    });

    signalingClient.on('close', () => {
        console.log('[VIEWER] Disconnected from signaling channel');
    });

    signalingClient.on('error', error => {
        console.error('[VIEWER] Signaling client error: ', error);
    });
    
    console.log('[VIEWER] Starting viewer connection');
    signalingClient.open();
    
    // At some point `signalingClient.close()` should be called
}
