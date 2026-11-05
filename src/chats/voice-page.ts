/**
 * Escapes text for HTML.
 */
function html(text: string): string {
    return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

/**
 * Serializes a value into an inline script safely.
 */
function scriptValue(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
        .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

/**
 * The dedicated media page of one voice call: an animated orb reflecting actual audio activity, the call/microphone
 * state, read-only live captions and, only when the browser requires it, one activation button for the microphone and
 * sound. It is a technical audio surface: no project navigation, no task/tool controls and no message composer; the
 * terminal stays the controller.
 *
 * @private voice media page
 */
export function voicePage(input: { readonly agent: string; readonly chat: string; readonly nonce: string; readonly socket: string }): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voice · ${html(input.agent)}</title>
<style nonce="${input.nonce}">
:root { color-scheme: light dark; --bg: #f6f5f2; --fg: #1d1d1f; --muted: #6b6b70; --accent: #3a6df0; --warn: #b5541a; --orb: #3a6df0; }
@media (prefers-color-scheme: dark) { :root { --bg: #121214; --fg: #ececf0; --muted: #9a9aa3; --accent: #7a9cff; --warn: #f0a070; --orb: #6f92ff; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; display: flex; align-items: center; justify-content: center; }
main { width: min(560px, 100% - 32px); text-align: center; padding: 32px 0; }
.orb { --level: 0; width: 160px; height: 160px; margin: 0 auto 28px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--orb) 55%, white), var(--orb)); transform: scale(calc(0.9 + var(--level) * 0.5)); transition: transform 90ms linear, opacity 300ms; opacity: 0.55; }
.orb.listening { opacity: 0.8; }
.orb.speaking { opacity: 1; }
.orb.idle { animation: breathe 3.2s ease-in-out infinite; }
@keyframes breathe { 50% { transform: scale(0.96); } }
@media (prefers-reduced-motion: reduce) { .orb { transition: none; animation: none !important; transform: none !important; } }
h1 { font-size: 22px; margin: 0 0 4px; }
.chat { color: var(--muted); margin: 0 0 18px; font-size: 14px; }
.state { font-weight: 600; margin: 0 0 6px; }
.mic { margin: 0 0 18px; color: var(--muted); font-size: 14px; }
.mic.live { color: var(--accent); }
.mic.off, .problem { color: var(--warn); }
.captions { text-align: left; min-height: 96px; border-top: 1px solid color-mix(in srgb, var(--muted) 30%, transparent); padding-top: 12px; }
.captions p { margin: 6px 0; }
.captions .who { font-weight: 600; }
.captions .provisional { color: var(--muted); font-style: italic; }
button { font: inherit; font-weight: 600; padding: 12px 20px; border-radius: 10px; border: 0; background: var(--accent); color: white; cursor: pointer; margin: 0 0 18px; }
button:focus-visible { outline: 3px solid var(--fg); outline-offset: 2px; }
.hint { color: var(--muted); font-size: 13px; margin-top: 22px; }
[hidden] { display: none !important; }
</style>
</head>
<body>
<main>
<div id="orb" class="orb idle" aria-hidden="true"></div>
<h1>${html(input.agent)}</h1>
<p class="chat">Voice in {${html(input.chat)}}</p>
<p id="state" class="state" role="status" aria-live="polite">Connecting…</p>
<p id="mic" class="mic">Microphone not connected</p>
<button id="activate" type="button" hidden>Allow microphone and sound</button>
<p id="problem" class="problem" hidden></p>
<section id="captions" class="captions" aria-label="Live captions" aria-live="polite"></section>
<audio id="voice" autoplay hidden></audio>
<p class="hint">Controls are in your terminal. Closing this page ends the voice call; the chat and its work continue.</p>
</main>
<script nonce="${input.nonce}">
(() => {
  const SOCKET = ${scriptValue(input.socket)};
  const AGENT = ${scriptValue(input.agent)};
  const RATE = 24000;
  const $ = (id) => document.getElementById(id);
  const orb = $('orb'), stateLine = $('state'), micLine = $('mic'), activate = $('activate'), problem = $('problem'), captions = $('captions'), voice = $('voice');
  let socket, context, peer, stream, remote, taps = [], micMuted = false, outputMuted = false, ended = false, loud = 0, level = 0, speaking = false, quietSince = 0;
  const finals = [];
  const provisional = { user: '', assistant: '' };
  const send = (message) => { if (socket && socket.readyState === 1) socket.send(JSON.stringify(message)); };
  const setLevel = (value) => { level = Math.max(value, level * 0.85); orb.style.setProperty('--level', String(Math.min(1, level * 4))); };
  const showProblem = (text) => { problem.textContent = text || ''; problem.hidden = !text; };
  const renderCaptions = () => {
    captions.replaceChildren();
    const line = (who, text, cls) => { const p = document.createElement('p'); if (cls) p.className = cls; const b = document.createElement('span'); b.className = 'who'; b.textContent = who + ': '; p.append(b, document.createTextNode(text)); captions.append(p); };
    for (const item of finals.slice(-4)) line(item.role === 'user' ? 'You' : AGENT, item.text);
    if (provisional.user) line('You', provisional.user, 'provisional');
    if (provisional.assistant) line(AGENT, provisional.assistant, 'provisional');
  };
  const resample = (input, from) => {
    if (from === RATE) return input;
    const length = Math.floor(input.length * RATE / from), out = new Float32Array(length);
    for (let i = 0; i < length; i++) { const x = i * from / RATE, j = Math.floor(x), f = x - j; out[i] = (input[j] || 0) * (1 - f) + (input[j + 1] || 0) * f; }
    return out;
  };
  // One tag byte (0 microphone, 1 the agent's voice) and Int16 PCM: the engine records both sides of the call.
  const tagged = (tag, samples) => { const out = new Uint8Array(1 + samples.length * 2), view = new DataView(out.buffer); out[0] = tag; for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i])); view.setInt16(1 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); } return out.buffer; };
  const rms = (samples) => { let sum = 0; for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]; return Math.sqrt(sum / samples.length); };
  const tap = (mediaStream, tag, onLevel) => {
    const source = context.createMediaStreamSource(mediaStream), processor = context.createScriptProcessor(2048, 1, 1), silent = context.createGain();
    silent.gain.value = 0; source.connect(processor); processor.connect(silent); silent.connect(context.destination);
    processor.onaudioprocess = (event) => {
      if (ended) return;
      const samples = event.inputBuffer.getChannelData(0), value = rms(samples);
      onLevel(value);
      if (tag === 0 && micMuted) return;
      if (socket && socket.readyState === 1) socket.send(tagged(tag, resample(samples, context.sampleRate)));
    };
    taps.push(source, processor, silent);
  };
  const capture = async () => {
    try {
      context = context || new AudioContext();
      if (context.state === 'suspended') await context.resume().catch(() => undefined);
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
        for (const track of stream.getAudioTracks()) track.enabled = !micMuted;
        tap(stream, 0, (value) => {
          if (micMuted) return;
          if (!speaking) setLevel(value);
          // Speaking over the agent: the provider cuts its answer off; the recording marks it interrupted.
          if (speaking && value > 0.04) { if (++loud === 3) send({ type: 'barge-in' }); } else loud = 0;
        });
      }
      if (!peer) await negotiate();
      if (voice.paused && remote) await voice.play().catch(() => { activate.hidden = false; send({ type: 'page', playback: 'blocked' }); });
      if (context.state !== 'running') { activate.hidden = false; send({ type: 'page', playback: 'blocked' }); return; }
      activate.hidden = true; showProblem('');
      send({ type: 'page', mic: 'live', playback: 'ok' });
    } catch (error) {
      const name = error && error.name;
      const mic = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'missing' : 'unavailable';
      showProblem(mic === 'denied' ? 'Microphone access was denied. Allow it in the browser’s site settings, then press the button.' : mic === 'missing' ? 'No microphone was found.' : 'The microphone could not be opened: ' + (error && error.message || 'unknown error'));
      activate.hidden = mic === 'missing';
      send({ type: 'page', mic });
    }
  };
  // The page owns the WebRTC connection to the provider; the engine only relays the offer and the answer.
  const negotiate = async () => {
    peer = new RTCPeerConnection();
    for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);
    peer.createDataChannel('oai-events');
    peer.ontrack = (event) => {
      remote = event.streams[0] || new MediaStream([event.track]);
      voice.srcObject = remote; voice.muted = outputMuted;
      voice.play().catch(() => { activate.hidden = false; send({ type: 'page', playback: 'blocked' }); });
      tap(remote, 1, (value) => {
        const now = Date.now();
        if (value > 0.01) { quietSince = 0; if (!speaking) { speaking = true; send({ type: 'output', state: 'speaking' }); } }
        else if (speaking) { quietSince = quietSince || now; if (now - quietSince > 700) { speaking = false; send({ type: 'output', state: 'idle' }); } }
        if (speaking && !outputMuted) setLevel(value);
      });
    };
    peer.onconnectionstatechange = () => send({ type: 'page', rtc: peer.connectionState });
    await peer.setLocalDescription(await peer.createOffer());
    await new Promise((resolve) => { if (peer.iceGatheringState === 'complete') return resolve(); peer.onicegatheringstatechange = () => peer.iceGatheringState === 'complete' && resolve(); setTimeout(resolve, 3000); });
    send({ type: 'offer', sdp: peer.localDescription.sdp });
  };
  const render = (view) => {
    micMuted = Boolean(view.micMuted);
    outputMuted = Boolean(view.outputMuted);
    if (stream) for (const track of stream.getAudioTracks()) track.enabled = !micMuted;
    voice.muted = outputMuted;
    const labels = { connecting: 'Connecting…', 'awaiting-browser': 'Waiting for the microphone…', listening: 'Listening', speaking: AGENT + ' is speaking', reconnecting: 'Reconnecting…', ending: 'Ending…', ended: 'Call ended', failed: 'Call failed' };
    stateLine.textContent = labels[view.state] || view.state;
    orb.className = 'orb ' + (view.state === 'speaking' ? 'speaking' : view.state === 'listening' ? 'listening' : 'idle');
    micLine.textContent = micMuted ? 'Microphone muted in the terminal' : stream ? 'Microphone on' + (outputMuted ? ' · sound muted' : '') : 'Microphone not connected';
    micLine.className = 'mic ' + (micMuted ? 'off' : stream ? 'live' : '');
    if (view.problem) showProblem(view.problem);
  };
  const finish = (reason) => {
    ended = true;
    if (stream) for (const track of stream.getTracks()) track.stop();
    if (peer) peer.close();
    for (const node of taps) { try { node.disconnect(); } catch {} }
    if (context) context.close().catch(() => undefined);
    voice.srcObject = null;
    stream = undefined; peer = undefined; activate.hidden = true;
    stateLine.textContent = reason || 'Call ended'; micLine.textContent = 'Microphone off'; micLine.className = 'mic';
    orb.className = 'orb';
  };
  activate.addEventListener('click', () => void capture());
  socket = new WebSocket(SOCKET);
  socket.onopen = () => { send({ type: 'format', sampleRate: RATE }); void capture(); };
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'state') render(message.view);
    else if (message.type === 'answer' && peer) peer.setRemoteDescription({ type: 'answer', sdp: message.sdp }).catch((error) => { showProblem('The voice connection failed: ' + error.message); send({ type: 'page', rtc: 'failed' }); });
    else if (message.type === 'caption') { provisional[message.role] = message.text; renderCaptions(); }
    else if (message.type === 'final') { provisional[message.role] = ''; finals.push({ role: message.role, text: message.text }); renderCaptions(); }
    else if (message.type === 'duplicate' || message.type === 'ended') finish(message.reason);
  };
  socket.onclose = () => { if (!ended) finish('The voice call is no longer connected. Start it again from the terminal.'); };
  addEventListener('pagehide', () => { if (socket) socket.close(); });
})();
</script>
</body>
</html>
`;
}
