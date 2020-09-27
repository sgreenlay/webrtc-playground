export function WebRTCConnection(role, logging) {
    const configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };
    this.connection = new RTCPeerConnection(configuration);

    this.info = {
        o: '',
        a: '',
        i: []
    };

    this.onAddIceCandidate = async (event) => {
        if (event.candidate != null) {
            const candidateJson = JSON.stringify(event.candidate.toJSON());
            if (logging) {
                console.log(`icecandidate: ${candidateJson}`);
            }

            this.info.i.push(candidateJson);
        }
    };
    this.connection.onicecandidate = this.onAddIceCandidate;

    this.onChannelStateChange = () => {
        const readyState = this.channel.readyState;
        if (logging) {
            console.log('Channel state is: ' + readyState);
        }

        if (readyState == 'open') {
            window.dispatchEvent(new Event('connectionready'));
        }
    }
    this.onChannelMessageCallback = (event) => {
        if (logging) {
            console.log('Received Message: ' + event.data);
        }

        window.dispatchEvent(new CustomEvent('connectiondatareceived', {
            detail: {
                text: event.data
            }
        }));
    }

    this.addIceCandidate = async (candidate) => {
        try {
            this.connection.addIceCandidate(candidate);
        } catch {
            if (logging) {

                console.log("Failed to add candidate");
            }
        }
    }
    this.sendData = (data) => {
        this.channel.send(data);
        if (logging) {

            console.log('Sent Data: ' + data);
        }
    }

    if (role == 'host') {
        this.channel = this.connection.createDataChannel('sendDataChannel');
        this.channel.onmessage = this.onChannelMessageCallback;
        this.channel.onopen = this.onChannelStateChange;
        this.channel.onclose = this.onChannelStateChange;

        this.connectToGuest = async (answer) => {
            this.connection.setRemoteDescription(answer);
        }

        const createOffer = async () => {
            const offer = await this.connection.createOffer();
            this.connection.setLocalDescription(offer);

            const offerJson = JSON.stringify(offer);

            if (logging) {
                console.log(`offer: ${offerJson}`);
            }

            this.info.o = offerJson;
        }
        createOffer();
    }
    else if (role == 'guest') {
        this.channelCallback = (event) => {
            if (logging) {
                console.log('Receive Channel Callback');
            }

            this.channel = event.channel;
            this.channel.onmessage = this.onChannelMessageCallback;
            this.channel.onopen = this.onChannelStateChange;
            this.channel.onclose = this.onChannelStateChange;
        }
        this.connection.ondatachannel = this.channelCallback;

        this.connectToHost = async (offer) => {
            this.connection.setRemoteDescription(offer);
            const answer = await this.connection.createAnswer();
            this.connection.setLocalDescription(answer);

            const answerJson = JSON.stringify(answer);

            if (logging) {
                console.log(`answer: ${answerJson}`);
            }

            this.info.a = answerJson;
        };
    }
};