import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";

const createPeerConnection = () =>
  new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

const getLocalMediaStream = async (constraints) => {
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  const legacyGetUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

  if (legacyGetUserMedia) {
    return new Promise((resolve, reject) => {
      legacyGetUserMedia.call(navigator, constraints, resolve, reject);
    });
  }

  throw new Error(
    "Microphone and camera access is not available. Open the app on HTTPS or localhost, and allow microphone/camera permissions.",
  );
};

export default function InternalCallPanel({
  activeCall,
  currentUser,
  modal = false,
  onEnd,
  socketRef,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const madeOfferRef = useRef(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const isAccepted = activeCall?.status === "accepted";
  const isVideoCall = activeCall?.type === "video";
  const isCaller = String(activeCall?.startedBy?.id) === String(currentUser?.id);

  const emitSignal = useCallback((signal) => {
    const socket = socketRef?.current;
    if (!socket || !activeCall?.id || !activeCall?.chatId) return;
    socket.emit("call:signal", {
      chatId: String(activeCall.chatId),
      callId: String(activeCall.id),
      signal,
    });
  }, [activeCall?.chatId, activeCall?.id, socketRef]);

  const makeOffer = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer || peer.signalingState !== "stable" || madeOfferRef.current) return;
    madeOfferRef.current = true;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    emitSignal({ type: "offer", description: offer });
    setStatus("Connecting");
  }, [emitSignal]);

  useEffect(() => {
    if (!isAccepted || !activeCall?.id || !activeCall?.chatId) return undefined;
    let cancelled = false;
    const socket = socketRef?.current;
    if (!window.RTCPeerConnection) {
      setError("Calls are not supported in this browser.");
      return undefined;
    }

    const peer = createPeerConnection();
    peerRef.current = peer;
    madeOfferRef.current = false;

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        emitSignal({ type: "ice-candidate", candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current && remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      setStatus("Connected");
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setStatus("Connected");
      if (["disconnected", "failed"].includes(peer.connectionState)) setStatus("Reconnecting");
      if (peer.connectionState === "closed") setStatus("Call closed");
    };

    const onPeerJoined = async (payload) => {
      if (String(payload.callId) !== String(activeCall.id)) return;
      if (isCaller) await makeOffer().catch((offerError) => setError(offerError.message));
    };

    const onSignal = async (payload) => {
      if (String(payload.callId) !== String(activeCall.id)) return;
      if (String(payload.fromUserId) === String(currentUser?.id)) return;
      const signal = payload.signal || {};

      try {
        if (signal.type === "offer") {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.description));
          madeOfferRef.current = false;
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          emitSignal({ type: "answer", description: answer });
          setStatus("Connecting");
        } else if (signal.type === "answer") {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.description));
        } else if (signal.type === "ice-candidate" && signal.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (signalError) {
        setError(signalError.message || "Call connection failed");
      }
    };

    const onPeerLeft = (payload) => {
      if (String(payload.callId) === String(activeCall.id)) setStatus("The other participant left");
    };

    const start = async () => {
      try {
        setStatus("Starting");
        const stream = await getLocalMediaStream({
          audio: true,
          video: isVideoCall,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        socket?.on("call:peer-joined", onPeerJoined);
        socket?.on("call:signal", onSignal);
        socket?.on("call:peer-left", onPeerLeft);
        setStatus("Waiting for participant");
        socket?.emit(
          "join:call",
          {
            chatId: String(activeCall.chatId),
            callId: String(activeCall.id),
          },
          (response) => {
            if (response?.ok && isCaller && response.peers?.length) {
              makeOffer().catch((offerError) => setError(offerError.message));
            }
          },
        );
      } catch (mediaError) {
        setError(mediaError.message || "Camera or microphone permission was denied");
      }
    };

    start();

    return () => {
      cancelled = true;
      socket?.off("call:peer-joined", onPeerJoined);
      socket?.off("call:signal", onSignal);
      socket?.off("call:peer-left", onPeerLeft);
      socket?.emit("leave:call", {
        chatId: String(activeCall.chatId),
        callId: String(activeCall.id),
      });
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      peer.close();
      localStreamRef.current = null;
      peerRef.current = null;
      madeOfferRef.current = false;
    };
  }, [
    activeCall?.chatId,
    activeCall?.id,
    currentUser?.id,
    emitSignal,
    isAccepted,
    isCaller,
    isVideoCall,
    makeOffer,
    socketRef,
  ]);

  const toggleTrack = (kind) => {
    const tracks = kind === "audio"
      ? localStreamRef.current?.getAudioTracks()
      : localStreamRef.current?.getVideoTracks();
    const nextEnabled = !tracks?.[0]?.enabled;
    tracks?.forEach((track) => { track.enabled = nextEnabled; });
    if (kind === "audio") setMicEnabled(nextEnabled);
    if (kind === "video") setCameraEnabled(nextEnabled);
  };

  if (!activeCall) return null;

  if (!isAccepted) {
    return (
      <Box px={2.5} py={1} display="flex" alignItems="center" justifyContent="space-between" gap={1}
        sx={{ bgcolor: "#fff7ed", borderBottom: "1px solid #fed7aa" }}>
        <Box minWidth={0}>
          <Typography fontSize={13} fontWeight={800} color="#9a3412" noWrap>
            Calling - waiting for an answer
          </Typography>
          <Typography fontSize={12} color="text.secondary" noWrap>
            Started by {activeCall.startedBy?.name || "someone"}
          </Typography>
        </Box>
        <Button size="small" color="warning" onClick={onEnd}>Cancel</Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: "#0f172a",
        color: "#fff",
        borderBottom: modal ? "none" : "1px solid #1f2a44",
        borderRadius: modal ? 1 : 0,
        overflow: "hidden",
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />
      {isVideoCall ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 150px" }, gap: 1, p: 1 }}>
          <Box sx={{ position: "relative", bgcolor: "#111827", height: modal ? { xs: 260, sm: 420 } : { xs: 190, sm: 220 }, borderRadius: 1, overflow: "hidden" }}>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <Typography sx={{ position: "absolute", left: 10, top: 8, fontSize: 12, bgcolor: "rgba(0,0,0,.55)", px: 1, py: 0.25, borderRadius: 1 }}>
              {status || "Connecting"}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: "#111827", height: modal ? { xs: 130, sm: 420 } : { xs: 110, sm: 220 }, borderRadius: 1, overflow: "hidden" }}>
            <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 1.5, minHeight: 96, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
            <AccountCircleIcon sx={{ fontSize: 56, color: "#93c5fd" }} />
            <Box minWidth={0}>
              <Typography fontSize={14} fontWeight={800} noWrap>
                Voice call
              </Typography>
              <Typography fontSize={12} sx={{ color: "#cbd5e1" }} noWrap>
                {status || "Connecting"}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mx: 1.5, mb: 1 }}>{error}</Alert>}
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ pb: 1.5 }}>
        <Tooltip title={micEnabled ? "Mute microphone" : "Unmute microphone"}>
          <IconButton color="inherit" onClick={() => toggleTrack("audio")}>
            {micEnabled ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        </Tooltip>
        {isVideoCall && (
          <Tooltip title={cameraEnabled ? "Turn camera off" : "Turn camera on"}>
            <IconButton color="inherit" onClick={() => toggleTrack("video")}>
              {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
          </Tooltip>
        )}
        <Button variant="contained" color="error" startIcon={<CallEndIcon />} onClick={onEnd}>
          End
        </Button>
      </Stack>
    </Box>
  );
}
