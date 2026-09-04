import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../mobileStyles";
import { userIdOf } from "../mobileConfig";

// Expo Go does not include native react-native-webrtc. Keep the import
// guarded so Expo Go can still open the app; custom Android builds get calls.
const webRTC = (() => {
  try {
    return require("react-native-webrtc");
  } catch {
    return null;
  }
})();

function MobileCallPanel({ activeCall, currentUser, socketRef, onEnd, darkTheme = false }) {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const offerMadeRef = useRef(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(activeCall?.type === "video");
  const [status, setStatus] = useState("Starting call…");
  const [error, setError] = useState("");
  const isVideo = activeCall?.type === "video";
  const currentUserId = String(userIdOf(currentUser));
  const isCaller = String(userIdOf(activeCall?.startedBy)) === currentUserId;
  const RTCView = webRTC?.RTCView;

  useEffect(() => {
    if (!activeCall?.id || activeCall.status !== "accepted") return undefined;
    if (!webRTC?.mediaDevices || !webRTC?.RTCPeerConnection) {
      setError("Live calls require the Pingly Android development build, not Expo Go.");
      return undefined;
    }
    let cancelled = false;
    const socket = socketRef.current;
    const peer = new webRTC.RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerRef.current = peer;
    const pendingCandidates = [];
    const emitSignal = (signal) => socket?.emit("call:signal", {
      chatId: String(activeCall.chatId),
      callId: String(activeCall.id),
      signal,
    });
    const makeOffer = async () => {
      if (!isCaller || offerMadeRef.current || peer.signalingState !== "stable") return;
      offerMadeRef.current = true;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      emitSignal({ type: "offer", description: offer });
      setStatus("Connecting…");
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) emitSignal({ type: "ice-candidate", candidate: event.candidate });
    };
    peer.ontrack = (event) => {
      if (event.streams?.[0]) setRemoteStream(event.streams[0].toURL());
      setStatus("Connected");
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setStatus("Connected");
      if (["disconnected", "failed"].includes(peer.connectionState)) setStatus("Reconnecting…");
    };
    const onPeerJoined = (payload) => {
      if (String(payload.callId) === String(activeCall.id)) makeOffer().catch((e) => setError(e.message));
    };
    const onSignal = async (payload) => {
      if (String(payload.callId) !== String(activeCall.id) || String(payload.fromUserId) === currentUserId) return;
      const signal = payload.signal || {};
      try {
        if (signal.type === "offer") {
          await peer.setRemoteDescription(new webRTC.RTCSessionDescription(signal.description));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          emitSignal({ type: "answer", description: answer });
          while (pendingCandidates.length) await peer.addIceCandidate(new webRTC.RTCIceCandidate(pendingCandidates.shift()));
          setStatus("Connecting…");
        } else if (signal.type === "answer") {
          await peer.setRemoteDescription(new webRTC.RTCSessionDescription(signal.description));
          while (pendingCandidates.length) await peer.addIceCandidate(new webRTC.RTCIceCandidate(pendingCandidates.shift()));
        } else if (signal.type === "ice-candidate" && signal.candidate) {
          if (peer.remoteDescription) await peer.addIceCandidate(new webRTC.RTCIceCandidate(signal.candidate));
          else pendingCandidates.push(signal.candidate);
        }
      } catch (e) { setError(e.message || "Call connection failed."); }
    };
    const joinCall = () => socket?.emit("join:call", { chatId: String(activeCall.chatId), callId: String(activeCall.id) }, (response) => {
      if (!response?.ok) setError("Unable to join the call.");
      if (response?.peers?.length) makeOffer().catch((e) => setError(e.message));
    });
    const start = async () => {
      try {
        const stream = await webRTC.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        if (cancelled) return stream.getTracks().forEach((track) => track.stop());
        localStreamRef.current = stream;
        setLocalStream(stream.toURL());
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        socket?.on("call:peer-joined", onPeerJoined);
        socket?.on("call:signal", onSignal);
        socket?.emit("join:call", { chatId: String(activeCall.chatId), callId: String(activeCall.id) }, (response) => {
          if (!response?.ok) setError("Unable to join the call.");
          if (response?.peers?.length) makeOffer().catch((e) => setError(e.message));
        });
        setStatus("Waiting for participant…");
      } catch (e) { setError(e.message || "Camera or microphone permission is required."); }
    };
    start();
    return () => {
      cancelled = true;
      socket?.off("call:peer-joined", onPeerJoined);
      socket?.off("call:signal", onSignal);
      socket?.emit("leave:call", { chatId: String(activeCall.chatId), callId: String(activeCall.id) });
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      peer.close();
      peerRef.current = null;
      localStreamRef.current = null;
    };
  }, [activeCall?.id, activeCall?.chatId, activeCall?.status, currentUserId, isCaller, isVideo, socketRef]);

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };
  const toggleCamera = () => {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCameraEnabled(next);
  };
  return <View style={{ width: "100%", alignItems: "center" }}>
    {isVideo && RTCView && remoteStream ? <RTCView streamURL={remoteStream} style={{ width: "100%", height: 190, backgroundColor: "#111" }} objectFit="cover" /> : null}
    {isVideo && RTCView && localStream ? <RTCView streamURL={localStream} style={{ width: 92, height: 125, backgroundColor: "#222", marginTop: 10 }} objectFit="cover" mirror /> : null}
    <Text style={[styles.callNotice, darkTheme && styles.darkMuted]}>{error || status}</Text>
    <View style={styles.callButtons}>
      <Pressable style={styles.callAccept} onPress={toggleMute}><Text style={styles.callButtonText}>{muted ? "Unmute" : "Mute"}</Text></Pressable>
      {isVideo && <Pressable style={styles.callAccept} onPress={toggleCamera}><Text style={styles.callButtonText}>{cameraEnabled ? "Camera off" : "Camera on"}</Text></Pressable>}
      <Pressable style={styles.callDecline} onPress={onEnd}><Text style={styles.callButtonText}>End call</Text></Pressable>
    </View>
  </View>;
}

export { MobileCallPanel };
