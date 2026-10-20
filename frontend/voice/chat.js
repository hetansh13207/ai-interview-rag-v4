// =====================================================
// API
// =====================================================

const API_BASE_URL =
    "http://127.0.0.1:8000";


// =====================================================
// DOM
// =====================================================

const chatMessages =
    document.getElementById(
        "chatMessages"
    );

const messageInput =
    document.getElementById(
        "messageInput"
    );

const sendButton =
    document.getElementById(
        "sendButton"
    );

const thinkingIndicator =
    document.getElementById(
        "thinkingIndicator"
    );

const timerElement =
    document.getElementById(
        "timer"
    );

const roleLabel =
    document.getElementById(
        "roleLabel"
    );

const interviewStatus =
    document.getElementById(
        "interviewStatus"
    );

const composerArea =
    document.getElementById(
        "composerArea"
    );

const completionPanel =
    document.getElementById(
        "completionPanel"
    );

const viewResultButton =
    document.getElementById(
        "viewResultButton"
    );

const messageCounter =
    document.getElementById(
        "messageCounter"
    );

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

const backButton =
    document.getElementById(
        "backButton"
    );

const voiceControls =
    document.getElementById(
        "voiceControls"
    );

const microphoneButton =
    document.getElementById(
        "microphoneButton"
    );

const microphoneButtonLabel =
    document.getElementById(
        "microphoneButtonLabel"
    );

const voiceState =
    document.getElementById(
        "voiceState"
    );

const voiceStatus =
    document.getElementById(
        "voiceStatus"
    );

const transcriptPreview =
    document.getElementById(
        "transcriptPreview"
    );


// =====================================================
// SESSION
// =====================================================

const sessionId =
    sessionStorage.getItem(
        "voiceInterviewSessionId"
    );

const resumeId =
    sessionStorage.getItem(
        "voiceInterviewResumeId"
    );

const storedRole =
    sessionStorage.getItem(
        "voiceInterviewRole"
    );

const storedDuration =
    Number(
        sessionStorage.getItem(
            "voiceInterviewDuration"
        )
    );


// =====================================================
// STATE
// =====================================================

let remainingSeconds =
    storedDuration > 0
        ? storedDuration * 60
        : 0;

let timerInterval =
    null;

let statusInterval =
    null;

let isSending =
    false;

let interviewCompleted =
    false;

const SpeechRecognitionAPI =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

const speechSynthesis =
    window.speechSynthesis;

let speechRecognition =
    null;

let recognitionStarting =
    false;

let recognitionActive =
    false;

let recognitionHadResult =
    false;

let recognitionHadFinalResult =
    false;

let recognitionErrorMessage =
    "";

let isSpeaking =
    false;

let activeUtterance =
    null;

let availableVoices =
    speechSynthesis
        ? speechSynthesis.getVoices()
        : [];


// =====================================================
// SESSION VALIDATION
// =====================================================

if (!sessionId) {

    window.location.href =
        "index.html";
}


// =====================================================
// INITIAL SETUP
// =====================================================

if (storedRole) {

    roleLabel.textContent =
        storedRole;
}


applySavedTheme();


// =====================================================
// THEME
// =====================================================

function applySavedTheme() {

    const savedTheme =
        localStorage.getItem(
            "platform-theme"
        );


    if (savedTheme === "dark") {

        document.body.classList.add(
            "dark-theme"
        );

        themeToggle.textContent =
            "☀";

    } else {

        document.body.classList.remove(
            "dark-theme"
        );

        themeToggle.textContent =
            "🌙";
    }
}


themeToggle.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark-theme"
        );


        const darkMode =
            document.body.classList.contains(
                "dark-theme"
            );


        localStorage.setItem(
            "platform-theme",
            darkMode
                ? "dark"
                : "light"
        );


        themeToggle.textContent =
            darkMode
                ? "☀"
                : "🌙";
    }
);


// =====================================================
// VOICE INPUT AND OUTPUT
// =====================================================

function updateVoiceControls(state, message) {
    voiceControls.dataset.state =
        state.toLowerCase();

    voiceState.textContent =
        state;

    voiceStatus.textContent =
        message;

    const listening =
        state === "Listening";

    microphoneButtonLabel.textContent =
        listening
            ? "Stop listening"
            : "Start speaking";

    microphoneButton.setAttribute(
        "aria-label",
        listening
            ? "Stop listening"
            : "Start speaking"
    );

    microphoneButton.disabled =
        !speechRecognition ||
        interviewCompleted ||
        isSending ||
        isSpeaking ||
        speechSynthesis?.speaking ||
        (recognitionStarting && !recognitionActive);
}


function syncComposerAvailability() {
    const disabled =
        isSending ||
        isSpeaking ||
        interviewCompleted;

    messageInput.disabled =
        disabled;

    sendButton.disabled =
        disabled;
}


function refreshSpeechVoices() {
    if (speechSynthesis) {
        availableVoices =
            speechSynthesis.getVoices();
    }
}


if (speechSynthesis) {
    refreshSpeechVoices();
    speechSynthesis.addEventListener(
        "voiceschanged",
        refreshSpeechVoices
    );
}


function getSpeechRecognitionError(error) {
    switch (error) {
        case "not-allowed":
        case "service-not-allowed":
            return "Microphone access was denied. Allow microphone access or type your answer.";
        case "audio-capture":
            return "No microphone is available. Connect a microphone or type your answer.";
        case "no-speech":
            return "No speech was detected. Try again or type your answer.";
        case "network":
            return "Browser speech recognition could not connect. Try again or type your answer.";
        case "language-not-supported":
            return "English speech recognition is unavailable in this browser. Type your answer instead.";
        default:
            return "Voice input stopped unexpectedly. Try again or type your answer.";
    }
}


function initializeSpeechRecognition() {
    if (!SpeechRecognitionAPI) {
        updateVoiceControls(
            "Unavailable",
            "Voice input is unavailable in this browser. You can still type your answers."
        );
        return;
    }

    try {
        speechRecognition =
            new SpeechRecognitionAPI();
    } catch (error) {
        updateVoiceControls(
            "Unavailable",
            "Voice input could not be started in this browser. You can still type your answers."
        );
        return;
    }

    speechRecognition.lang =
        "en-US";

    speechRecognition.continuous =
        false;

    speechRecognition.interimResults =
        true;

    speechRecognition.maxAlternatives =
        1;

    speechRecognition.onstart = () => {
        recognitionStarting = false;
        recognitionActive = true;
        updateVoiceControls(
            "Listening",
            "Speak your answer. Select Stop listening when you are finished."
        );
    };

    speechRecognition.onresult = event => {
        let finalAnswer = "";
        let interimAnswer = "";

        for (
            let index = 0;
            index < event.results.length;
            index += 1
        ) {
            const result =
                event.results[index];

            const transcript =
                result[0]?.transcript || "";

            if (result.isFinal) {
                finalAnswer += `${transcript} `;
            } else {
                interimAnswer += `${transcript} `;
            }
        }

        const displayedAnswer =
            `${finalAnswer}${interimAnswer}`.trim();

        if (displayedAnswer) {
            recognitionHadResult = true;
            transcriptPreview.textContent =
                `Transcript: ${displayedAnswer}`;
            transcriptPreview.classList.remove(
                "hidden"
            );
        }

        const submittedAnswer =
            finalAnswer.trim();

        if (
            submittedAnswer &&
            !recognitionErrorMessage
        ) {
            recognitionHadFinalResult = true;
            transcriptPreview.textContent =
                `Transcript: ${submittedAnswer}`;

            const existingInput =
                messageInput.value;
            const separator =
                existingInput && !/\s$/.test(existingInput)
                    ? " "
                    : "";

            messageInput.value =
                `${existingInput}${separator}${submittedAnswer}`;

            updateCharacterCount();
            autoResizeTextarea();
        }
    };

    speechRecognition.onerror = event => {
        recognitionStarting = false;
        recognitionActive = false;
        recognitionErrorMessage =
            getSpeechRecognitionError(event.error);

        updateVoiceControls(
            "Error",
            recognitionErrorMessage
        );
    };

    speechRecognition.onend = () => {
        recognitionStarting = false;
        recognitionActive = false;

        if (interviewCompleted) {
            updateVoiceControls(
                isSpeaking ? "Speaking" : "Ready",
                isSpeaking
                    ? "The interviewer is finishing the closing response."
                    : "The interview is complete."
            );
            return;
        }

        if (isSending || isSpeaking) {
            updateVoiceControls(
                isSpeaking ? "Speaking" : "Processing",
                isSpeaking
                    ? "The interviewer is speaking."
                    : "Submitting your transcribed answer..."
            );
            return;
        }

        if (recognitionErrorMessage) {
            updateVoiceControls(
                "Error",
                recognitionErrorMessage
            );
        } else if (
            !recognitionHadResult ||
            !recognitionHadFinalResult
        ) {
            updateVoiceControls(
                "Error",
                "Voice capture ended before an answer was recognized. Try again or type your answer."
            );
        } else {
            updateVoiceControls(
                "Ready",
                "Review or edit your transcript, then select Send."
            );
        }
    };

    updateVoiceControls(
        "Ready",
        "Speak your answer or type it below."
    );
}


function startListening() {
    if (!speechRecognition || interviewCompleted || isSending) {
        return;
    }

    if (isSpeaking || speechSynthesis?.speaking) {
        updateVoiceControls(
            "Speaking",
            "Wait until the interviewer has finished speaking before answering."
        );
        return;
    }

    if (recognitionActive || recognitionStarting) {
        return;
    }

    recognitionErrorMessage = "";
    recognitionHadResult = false;
    recognitionHadFinalResult = false;
    transcriptPreview.textContent = "";
    transcriptPreview.classList.add("hidden");
    recognitionStarting = true;

    updateVoiceControls(
        "Ready",
        "Starting microphone..."
    );

    try {
        speechRecognition.start();
    } catch (error) {
        recognitionStarting = false;
        updateVoiceControls(
            "Error",
            error.name === "InvalidStateError"
                ? "Voice input is already active. Wait a moment and try again."
                : "The microphone could not be started. Allow microphone access or type your answer."
        );
    }
}


function stopRecognition() {
    if (
        speechRecognition &&
        (recognitionActive || recognitionStarting)
    ) {
        try {
            speechRecognition.abort();
        } catch (error) {
            if (error.name !== "InvalidStateError") {
                throw error;
            }
        }
    }

    recognitionStarting = false;
    recognitionActive = false;
}


function chooseEnglishVoice() {
    refreshSpeechVoices();

    return availableVoices.find(
        voice => voice.lang?.toLowerCase() === "en-us"
    ) || availableVoices.find(
        voice => voice.lang?.toLowerCase().startsWith("en")
    ) || null;
}


function speakInterviewerResponse(text) {
    if (
        !speechSynthesis ||
        !("SpeechSynthesisUtterance" in window)
    ) {
        updateVoiceControls(
            "Ready",
            "The interviewer response is shown above. Audio playback is unavailable; continue by typing or using voice input."
        );
        return false;
    }

    cancelSpeech();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.lang =
        "en-US";

    const englishVoice =
        chooseEnglishVoice();

    if (englishVoice) {
        utterance.voice =
            englishVoice;
    }

    activeUtterance =
        utterance;

    isSpeaking = true;
    syncComposerAvailability();
    updateVoiceControls(
        "Speaking",
        "The interviewer is speaking. You can answer when playback finishes."
    );

    utterance.onstart = () => {
        if (activeUtterance === utterance) {
            isSpeaking = true;
            syncComposerAvailability();
            updateVoiceControls(
                "Speaking",
                "The interviewer is speaking. You can answer when playback finishes."
            );
        }
    };

    utterance.onend = () => {
        if (activeUtterance !== utterance) {
            return;
        }

        activeUtterance = null;
        isSpeaking = false;
        syncComposerAvailability();

        if (!interviewCompleted) {
            updateVoiceControls(
                "Ready",
                speechRecognition
                    ? "Speak your answer or type it below."
                    : "Audio input is unavailable; type your answer below."
            );
        }

    };

    utterance.onerror = event => {
        if (activeUtterance !== utterance) {
            return;
        }

        activeUtterance = null;
        isSpeaking = false;
        syncComposerAvailability();

        if (!interviewCompleted) {
            updateVoiceControls(
                "Error",
                event.error === "canceled" || event.error === "interrupted"
                    ? "Audio playback stopped. You can continue by typing or using voice input."
                    : "Audio playback failed. The interviewer response remains available above."
            );
        }

    };

    try {
        speechSynthesis.speak(utterance);
    } catch (error) {
        activeUtterance = null;
        isSpeaking = false;
        syncComposerAvailability();
        updateVoiceControls(
            "Error",
            "Audio playback failed. The interviewer response remains available above."
        );
        return false;
    }

    return true;
}


function cancelSpeech() {
    activeUtterance = null;
    isSpeaking = false;

    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
}


function stopVoiceFeatures() {
    stopRecognition();
    cancelSpeech();
}


microphoneButton.addEventListener(
    "click",
    () => {
        if (recognitionActive) {
            updateVoiceControls(
                "Processing",
                "Finishing voice capture..."
            );

            try {
                speechRecognition.stop();
            } catch (error) {
                if (error.name !== "InvalidStateError") {
                    updateVoiceControls(
                        "Error",
                        "Voice capture could not be stopped. Try again or type your answer."
                    );
                }
            }
            return;
        }

        startListening();
    }
);


initializeSpeechRecognition();


// =====================================================
// MESSAGE RENDERING
// =====================================================

function addMessage(
    role,
    content
) {

    if (!content) {
        return;
    }


    const row =
        document.createElement(
            "div"
        );

    row.className =
        `message-row ${role}`;


    const group =
        document.createElement(
            "div"
        );

    group.className =
        "message-group";


    const avatar =
        document.createElement(
            "div"
        );

    avatar.className =
        "message-avatar";


    avatar.textContent =
        role === "ai"
            ? "AI"
            : "YOU";


    const contentWrapper =
        document.createElement(
            "div"
        );

    contentWrapper.className =
        "message-content";


    const name =
        document.createElement(
            "span"
        );

    name.className =
        "message-name";


    name.textContent =
        role === "ai"
            ? "AI Interviewer"
            : "You";


    const bubble =
        document.createElement(
            "div"
        );

    bubble.className =
        "message-bubble";


    bubble.textContent =
        content;


    contentWrapper.appendChild(
        name
    );

    contentWrapper.appendChild(
        bubble
    );


    group.appendChild(
        avatar
    );

    group.appendChild(
        contentWrapper
    );


    row.appendChild(
        group
    );


    chatMessages.appendChild(
        row
    );


    scrollChatToBottom();
}


// =====================================================
// LOAD EXISTING SESSION
// =====================================================

async function loadInterview() {

    try {

        const response =
            await fetchWithAuth(
                `${API_BASE_URL}/interview/chat/${sessionId}/status`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not load interview session."
            );
        }


        remainingSeconds =
            data.remaining_seconds;


        updateTimer();


        if (data.completed) {

            completeInterview();

            return;
        }


        /*
         * The setup page already received the opening
         * AI message. Fetching the session itself is
         * not currently exposed by the backend, so we
         * use the opening message saved by the setup page
         * when available.
         */
        const openingMessage =
            sessionStorage.getItem(
                "voiceInterviewOpeningMessage"
            );

        if (openingMessage) {

            addMessage(
                "ai",
                openingMessage
            );
        }

        startTimer();

        startStatusPolling();

        if (openingMessage) {
            speakInterviewerResponse(
                openingMessage
            );
        }


        messageInput.focus();

    } catch (error) {

        showInterviewStatus(
            error.message ||
            "Could not load the interview."
        );

        disableComposer();
    }
}


// =====================================================
// TIMER
// =====================================================

function formatTime(
    seconds
) {

    const safeSeconds =
        Math.max(
            0,
            Math.floor(seconds)
        );


    const minutes =
        Math.floor(
            safeSeconds / 60
        );


    const remaining =
        safeSeconds % 60;


    return (
        String(minutes).padStart(
            2,
            "0"
        ) +
        ":" +
        String(remaining).padStart(
            2,
            "0"
        )
    );
}


function updateTimer() {

    timerElement.textContent =
        formatTime(
            remainingSeconds
        );


    timerElement.classList.remove(
        "warning",
        "danger"
    );


    if (
        remainingSeconds <= 30 &&
        remainingSeconds > 10
    ) {

        timerElement.classList.add(
            "warning"
        );
    }


    if (
        remainingSeconds <= 10
    ) {

        timerElement.classList.add(
            "danger"
        );
    }
}


function startTimer() {

    stopTimer();


    timerInterval =
        setInterval(
            () => {

                if (
                    interviewCompleted
                ) {

                    stopTimer();

                    return;
                }


                remainingSeconds =
                    Math.max(
                        0,
                        remainingSeconds - 1
                    );


                updateTimer();


                if (
                    remainingSeconds <= 0
                ) {

                    completeInterview();
                }

            },
            1000
        );
}


function stopTimer() {

    if (
        timerInterval !== null
    ) {

        clearInterval(
            timerInterval
        );

        timerInterval =
            null;
    }
}


// =====================================================
// BACKEND TIMER SYNC
// =====================================================

function startStatusPolling() {

    stopStatusPolling();


    statusInterval =
        setInterval(
            syncInterviewStatus,
            5000
        );
}


function stopStatusPolling() {

    if (
        statusInterval !== null
    ) {

        clearInterval(
            statusInterval
        );

        statusInterval =
            null;
    }
}


async function syncInterviewStatus() {

    if (
        interviewCompleted
    ) {

        return;
    }


    try {

        const response =
            await fetchWithAuth(
                `${API_BASE_URL}/interview/chat/${sessionId}/status`
            );


        const data =
            await response.json();


        if (!response.ok) {
            return;
        }


        remainingSeconds =
            data.remaining_seconds;


        updateTimer();


        if (data.completed) {

            completeInterview();
        }

    } catch (error) {

        /*
         * A temporary status request failure should not
         * immediately terminate the interview.
         *
         * The backend remains authoritative when the
         * next message is sent.
         */
        console.warn(
            "Interview status sync failed:",
            error
        );
    }
}


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage(messageOverride) {

    if (
        isSending ||
        interviewCompleted ||
        isSpeaking
    ) {

        return;
    }


    const message =
        typeof messageOverride === "string"
            ? messageOverride.trim()
            : messageInput.value.trim();


    if (!message) {
        return;
    }


    if (
        remainingSeconds <= 0
    ) {

        completeInterview();

        return;
    }


    isSending =
        true;

    stopRecognition();

    updateVoiceControls(
        "Processing",
        "Submitting your answer and preparing the next interviewer response..."
    );

    syncComposerAvailability();

    addMessage(
        "candidate",
        message
    );


    messageInput.value =
        "";

    updateCharacterCount();

    autoResizeTextarea();


    setComposerLoading(
        true
    );


    let responseHandledSuccessfully = false;

    try {

        const response =
            await fetchWithAuth(
                `${API_BASE_URL}/interview/chat/message`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        session_id:
                            sessionId,

                        message:
                            message,
                    }),
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            if (
                response.status === 400 &&
                (
                    data.detail
                        ?.toLowerCase()
                        .includes(
                            "expired"
                        ) ||
                    data.detail
                        ?.toLowerCase()
                        .includes(
                            "completed"
                        )
                )
            ) {

                completeInterview();

                return;
            }


            throw new Error(
                data.detail ||
                "Failed to send your answer."
            );
        }

        responseHandledSuccessfully = true;


        /*
         * Always render the latest AI message FIRST.
         *
         * This is important when the candidate answers
         * the closing question. The backend returns:
         *
         *   final AI message
         *   completed = true
         *
         * We must display the final AI message before
         * showing the completed state.
         */
        const messages =
            Array.isArray(
                data.messages
            )
                ? data.messages
                : [];


        const latestAiMessage =
            [...messages]
                .reverse()
                .find(
                    (item) =>
                        item.role ===
                        "ai"
                );

        receivedAiResponse =
            Boolean(latestAiMessage?.content);


        if (
            latestAiMessage &&
            latestAiMessage.content
        ) {

            addMessage(
                "ai",
                latestAiMessage.content
            );
        }

        if (
            latestAiMessage &&
            latestAiMessage.content &&
            !data.completed
        ) {
            speakInterviewerResponse(
                latestAiMessage.content
            );
        }

        /*
         * Only after rendering the final AI message
         * should we complete the interview.
         */
        if (data.completed) {

            completeInterview(
                "The interview is complete. "
                + "Your final report is being prepared.",
                latestAiMessage?.content
            );

            return;
        }


        /*
         * Re-sync with the backend after every
         * normal interview response.
         */
        await syncInterviewStatus();

    } catch (error) {

        showInterviewStatus(
            error.message ||
            "Something went wrong while sending your answer."
        );

        updateVoiceControls(
            "Error",
            "Your answer could not be submitted. Try again or type your answer."
        );

    } finally {

        isSending =
            false;

        setComposerLoading(
            false
        );

        if (
            !interviewCompleted &&
            !isSpeaking &&
            !recognitionActive &&
            responseHandledSuccessfully &&
            !receivedAiResponse
        ) {
            updateVoiceControls(
                "Ready",
                speechRecognition
                    ? "Speak your answer or type it below."
                    : "Voice input is unavailable; type your answer below."
            );
        }

        if (
            !interviewCompleted &&
            !isSpeaking
        ) {

            messageInput.focus();
        }
    }
}


// =====================================================
// COMPOSER LOADING
// =====================================================

function setComposerLoading(
    loading
) {

    if (loading) {

        thinkingIndicator.classList.remove(
            "hidden"
        );

        scrollChatToBottom();

    } else {

        thinkingIndicator.classList.add(
            "hidden"
        );
    }

    syncComposerAvailability();

    if (isSpeaking) {
        updateVoiceControls(
            "Speaking",
            "The interviewer is speaking. You can answer when playback finishes."
        );
    } else if (isSending) {
        updateVoiceControls(
            "Processing",
            "Submitting your answer and preparing the next interviewer response..."
        );
    }
}


// =====================================================
// DISABLE COMPOSER
// =====================================================

function disableComposer() {

    messageInput.disabled =
        true;

    sendButton.disabled =
        true;

    microphoneButton.disabled =
        true;

    messageInput.placeholder =
        "Interview is no longer active.";
}


// =====================================================
// INTERVIEW COMPLETION
// =====================================================

function completeInterview(
    statusMessage,
    finalResponse
) {

    if (
        interviewCompleted
    ) {

        return;
    }


    interviewCompleted =
        true;

    document
    .querySelector(".chat-app")
    .classList.add(
        "interview-completed"
    );

    stopTimer();

    stopStatusPolling();

    stopRecognition();

    disableComposer();
    updateVoiceControls(
        "Ready",
        "The interview is complete."
    );


    thinkingIndicator.classList.add(
        "hidden"
    );


    showInterviewStatus(
        statusMessage ||
        "The interview time has ended. "
        + "Your final report is being prepared."
    );

    composerArea.classList.add(
        "hidden"
    );

    if (finalResponse) {
        speakInterviewerResponse(finalResponse);
    } else {
        cancelSpeech();
    }

    showCompletionPanel();
}

function showCompletionPanel() {
    completionPanel.classList.remove(
        "hidden"
    );
}


// =====================================================
// RESULT BUTTON
// =====================================================

viewResultButton.addEventListener(
    "click",
    async () => {

        if (!sessionId) {
            return;
        }

        viewResultButton.disabled = true;
        viewResultButton.innerHTML = "Preparing Report...";

        try {

            const response = await fetchWithAuth(
                `${API_BASE_URL}/interview/chat/${sessionId}/result`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    "Could not generate the final report."
                );
            }

            sessionStorage.setItem(
                "voiceInterviewResult",
                JSON.stringify(data)
            );

            // Go to the new report page
            window.location.href = "result.html";

        } catch (error) {

            viewResultButton.disabled = false;
            viewResultButton.innerHTML = "View Final Report →";

            showInterviewStatus(
                error.message ||
                "Could not generate the final report."
            );
        }
    }
);


// =====================================================
// TEXTAREA
// =====================================================

function autoResizeTextarea() {

    messageInput.style.height =
        "auto";


    const newHeight =
        Math.min(
            messageInput.scrollHeight,
            160
        );


    messageInput.style.height =
        `${newHeight}px`;
}


function updateCharacterCount() {

    const length =
        messageInput.value.length;


    messageCounter.textContent =
        `${length} / 5000`;
}


messageInput.addEventListener(
    "input",
    () => {

        updateCharacterCount();

        autoResizeTextarea();
    }
);


// =====================================================
// KEYBOARD
// =====================================================

messageInput.addEventListener(
    "keydown",
    (event) => {

        /*
         * Enter sends the message.
         *
         * Shift + Enter creates a new line.
         */
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);


// =====================================================
// SEND BUTTON
// =====================================================

sendButton.addEventListener(
    "click",
    sendMessage
);


// =====================================================
// BACK BUTTON
// =====================================================

backButton.addEventListener(
    "click",
    (event) => {

        if (
            !interviewCompleted &&
            chatMessages.children.length > 0
        ) {

            const leave =
                window.confirm(
                    "Leave this interview? Your current session will remain incomplete."
                );


            if (!leave) {

                event.preventDefault();
            } else {
                stopVoiceFeatures();
            }
        }
    }
);


window.addEventListener(
    "pagehide",
    stopVoiceFeatures
);


// =====================================================
// STATUS MESSAGE
// =====================================================

function showInterviewStatus(
    message
) {

    interviewStatus.textContent =
        message;

    interviewStatus.classList.remove(
        "hidden"
    );
}


// =====================================================
// CHAT SCROLL
// =====================================================

function scrollChatToBottom() {

    requestAnimationFrame(
        () => {

            chatMessages.scrollTop =
                chatMessages.scrollHeight;
        }
    );
}


// =====================================================
// SAVE OPENING MESSAGE
// =====================================================

/*
 * The setup page receives the opening AI message from
 * /interview/chat/start. Save it before navigating to
 * chat.html.
 *
 * This value is consumed by loadInterview().
 */


// =====================================================
// INITIALIZE
// =====================================================

window.clerkReady.then(loadInterview);