const faqString = `
**How can I expose the Ollama server?**

By default, Ollama allows cross origin requests from 127.0.0.1 and 0.0.0.0.

To support more origins, you can use the OLLAMA_ORIGINS environment variable:

\`\`\`
OLLAMA_ORIGINS=${window.location.origin} ollama serve
\`\`\`

Also see: https://github.com/jmorganca/ollama/blob/main/docs/faq.md
`;

const clipboardIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
</svg>`;
const textBoxBaseHeight = 40; // This should match the default height set in CSS

// change settings of marked from default to remove deprecation warnings
// see conversation here: https://github.com/markedjs/marked/issues/2793
marked.use({
  mangle: false,
  headerIds: false,
});

function autoFocusInput() {
  const userInput = document.getElementById("user-input");
  userInput.focus();
}

/*
takes in model as a string
updates the query parameters of page url to include model name
*/
function updateModelInQueryString(model) {
  // make sure browser supports features
  if (window.history.replaceState && "URLSearchParams" in window) {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("model", model);
    // replace current url without reload
    const newPathWithQuery = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.replaceState(null, "", newPathWithQuery);
  }
}

// Fetch available models and populate the dropdown
async function populateModels() {
  document
    .getElementById("send-button")
    .addEventListener("click", submitRequest);

  try {
    const data = await getModels();

    const selectElement = document.getElementById("model-select");

    // set up handler for selection
    selectElement.onchange = () =>
      updateModelInQueryString(selectElement.value);

    data.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.name;
      option.innerText = model.name;
      selectElement.appendChild(option);
    });

    // select option present in url parameter if present
    const queryParams = new URLSearchParams(window.location.search);
    const requestedModel = queryParams.get("model");
    // update the selection based on if requestedModel is a value in options
    if (
      [...selectElement.options].map((o) => o.value).includes(requestedModel)
    ) {
      selectElement.value = requestedModel;
    }
    // otherwise set to the first element if exists and update URL accordingly
    else if (selectElement.options.length) {
      selectElement.value = selectElement.options[0].value;
      updateModelInQueryString(selectElement.value);
    }
  } catch (error) {
    document.getElementById("errorText").innerHTML = DOMPurify.sanitize(
      marked.parse(
        `llm-chat was unable to communitcate with Ollama due to the following error:\n\n` +
          `\`\`\`${error.message}\`\`\`\n\n---------------------\n` +
          faqString,
      ),
    );
    let modal = new bootstrap.Modal(document.getElementById("errorModal"));
    modal.show();
  }
}

// adjusts the padding at the bottom of scrollWrapper to be the height of the input box
function adjustPadding() {
  const inputBoxHeight = document.getElementById("input-area").offsetHeight;
  const scrollWrapper = document.getElementById("scroll-wrapper");
  scrollWrapper.style.paddingBottom = `${inputBoxHeight + 15}px`;
}

// sets up padding resize whenever input box has its height changed
const autoResizePadding = new ResizeObserver(() => {
  adjustPadding();
});
autoResizePadding.observe(document.getElementById("input-area"));

// Function to get the selected model
function getSelectedModel() {
  return document.getElementById("model-select").value;
}

// variables to handle auto-scroll
// we only need one ResizeObserver and isAutoScrollOn variable globally
// no need to make a new one for every time submitRequest is called
const scrollWrapper = document.getElementById("scroll-wrapper");
let isAutoScrollOn = true;
// autoscroll when new line is added
const autoScroller = new ResizeObserver(() => {
  if (isAutoScrollOn) {
    scrollWrapper.scrollIntoView({ behavior: "smooth", block: "end" });
  }
});

// event listener for scrolling
let lastKnownScrollPosition = 0;
let ticking = false;
document.addEventListener("scroll", (event) => {
  // if user has scrolled up and autoScroll is on we turn it off
  if (!ticking && isAutoScrollOn && window.scrollY < lastKnownScrollPosition) {
    window.requestAnimationFrame(() => {
      isAutoScrollOn = false;
      ticking = false;
    });
    ticking = true;
  }
  // if user has scrolled nearly all the way down and autoScroll is disabled, re-enable
  else if (
    !ticking &&
    !isAutoScrollOn &&
    window.scrollY > lastKnownScrollPosition && // make sure scroll direction is down
    window.scrollY >=
      document.documentElement.scrollHeight - window.innerHeight - 30 // add 30px of space--no need to scroll all the way down, just most of the way
  ) {
    window.requestAnimationFrame(() => {
      isAutoScrollOn = true;
      ticking = false;
    });
    ticking = true;
  }
  lastKnownScrollPosition = window.scrollY;
});

const SYSTEM_PROMPT = `You are VaultManager, the support bot for MegaVault built by R3AP3Reditz (original name: Anish Kumar), a premier cloud storage platform available worldwide. As VaultManager, your role is to assist users with inquiries related to MegaVault. You must provide accurate and helpful information for all questions asked. If you don't know the answer or if the question is not related to MegaVault, provide the user with the support contact details.
Correct support email: support@megavault.in
Try to answer questions correctly without anything unnecessary and never provide wrong contact details.
Key Features:
Unlimited Cloud Storage: No limits on storage; users can upload as much as they need.
Max Upload Size: Up to 3.7GB on the Enterprise Plan.
File Sharing: Generate secure shareable links for easy collaboration.
Streaming Capabilities: Stream videos directly from the platform without needing to download them.
Image Viewer: Preview images in the browser before downloading.
Trash Functionality: Easily restore accidentally deleted files.
User-Friendly Interface: Options to create new folders, upload files from a URL or device, rename files, monitor upload progress, and manage files efficiently.
Subscription Plans:
Hobby Plan: $4.17/month (₹340) - Unlimited storage, 1GB max upload size, and basic features.
Basic Plan: $6/month (₹980) - Unlimited storage, 1.5GB max upload size, and full server uptime.
Enterprise Plan: $13.22/month (₹1100) - Unlimited storage, 3.5GB max upload size, priority speeds, and enhanced support.
Account Access: Users can log in using their User ID or Email for easy access to their storage.
Customer Support: For inquiries, users can reach out via:
Email: support@megavault.in
WhatsApp: WhatsApp +91 9481594558
Telegram: @R3AP3Redit
Terms and Conditions: MegaVault’s terms govern the use of their services. Creating an account requires accurate information and prohibits transfer. Payments are made under the company owner's name, DEVIPRASAD SUNIL RAO. Users must follow guidelines to avoid account suspension. Intellectual property rights belong to MegaVault, granting limited access for personal use. Violating terms may lead to account termination. By accepting the terms, users agree to these conditions. It's crucial to read and accept the privacy policy.
Updates:
Version 1.5.0 (03/11/2024): Introduction of a new support bot (currently undergoing training).
Version 1.4 (02/11/2024): New "Hobby Plan" added with unlimited storage and competitive pricing.
Version 1.3 (02/11/2024): Automatic adjustment of the last paid date after successful payments.
Version 1.2 (02/11/2024): Enhanced payment verification with user ID and email.
Version 1.1 (02/11/2024): Updates to privacy policy and terms concerning new user data handling.
Version 1.0 (11/08/2024): Initial launch with core features.
Summary: MegaVault offers comprehensive customer support solutions to assist clients with any issues or inquiries they may have. With a commitment to security and user satisfaction, MegaVault is the ideal choice for anyone looking for reliable and scalable cloud storage solutions.
Important Note for you: Please provide the following links and contact information as clickable links. This service is available worldwide! There is no return policy as we provide a 7-day free trial; after that, you need to pay to use. Provide info for what they ask; don't provide big info. If you don't know or things are not mentioned here, provide the user the support contact details. Always provide info that is asked and provide the mobile number only when it is asked. Try to be the answer completely based on the question, please, so that users will find it helpful but feel burdened.
Support: https://megavault.in/support.html
Terms: https://megavault.in/terms.html
Privacy Policy: https://megavault.in/privacy-policy.html
Updates/New Features: https://megavault.in/updates.html
New User Demo: https://megavault.in/new.html
Sign In to Your Storage Account: https://megavault.in/signin.html
Pay to Expand Your Subscription: https://megavault.in/pay.html
Logout: https://megavault.in/logout.html
Note: Donations are accepted to help us improve our services.
`;

// Function to handle the user input and call the API functions
async function submitRequest() {
  document.getElementById("chat-container").style.display = "block";

  const input = document.getElementById("user-input").value;
  const selectedModel = getSelectedModel();
  const context = document.getElementById("chat-history").context;

  const data = {
    model: selectedModel,
    prompt: input,
    context: context,
    system: SYSTEM_PROMPT, // Use the inbuilt system prompt
  };

  // Create user message element and append to chat history
  let chatHistory = document.getElementById("chat-history");
  let userMessageDiv = document.createElement("div");
  userMessageDiv.className = "mb-2 user-message";
  userMessageDiv.innerText = input;
  chatHistory.appendChild(userMessageDiv);

  // Create response container
  let responseDiv = document.createElement("div");
  responseDiv.className = "response-message mb-2 text-start";
  responseDiv.style.minHeight = "3em"; // make sure div does not shrink if we cancel the request when no text has been generated yet
  spinner = document.createElement("div");
  spinner.className = "spinner-border text-light";
  spinner.setAttribute("role", "status");
  responseDiv.appendChild(spinner);
  chatHistory.appendChild(responseDiv);

  // create button to stop text generation
  let interrupt = new AbortController();
  let stopButton = document.createElement("button");
  stopButton.className = "btn btn-danger";
  stopButton.innerHTML = "Stop";
  stopButton.onclick = (e) => {
    e.preventDefault();
    interrupt.abort("Stop button pressed");
  };
  // add button after sendButton
  const sendButton = document.getElementById("send-button");
  sendButton.insertAdjacentElement("beforebegin", stopButton);

  // change autoScroller to keep track of our new responseDiv
  autoScroller.observe(responseDiv);

  postRequest(data, interrupt.signal)
    .then(async (response) => {
      await getResponse(response, (parsedResponse) => {
        let word = parsedResponse.response;
        if (parsedResponse.done) {
          chatHistory.context = parsedResponse.context;
          // Copy button
          let copyButton = document.createElement("button");
          copyButton.className = "btn btn-secondary copy-button";
          copyButton.innerHTML = clipboardIcon;
          copyButton.onclick = () => {
            navigator.clipboard
              .writeText(responseDiv.hidden_text)
              .then(() => {
                console.log("Text copied to clipboard");
              })
              .catch((err) => {
                console.error("Failed to copy text:", err);
              });
          };
          responseDiv.appendChild(copyButton);
        }
        // add word to response
        if (word != undefined && word != "") {
          if (responseDiv.hidden_text == undefined) {
            responseDiv.hidden_text = "";
          }
          responseDiv.hidden_text += word;
          responseDiv.innerHTML = DOMPurify.sanitize(
            marked.parse(responseDiv.hidden_text),
          ); // Append word to response container
        }
      });
    })
    .then(() => {
      stopButton.remove(); // Remove stop button from DOM now that all text has been generated
      spinner.remove();
    })
    .catch((error) => {
      if (error !== "Stop button pressed") {
        console.error(error);
      }
      stopButton.remove();
      spinner.remove();
    });

  // Clear user input
  const element = document.getElementById("user-input");
  element.value = "";
  $(element).css("height", textBoxBaseHeight + "px");
}

// Event listener for Ctrl + Enter or CMD + Enter
document.getElementById("user-input").addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    submitRequest();
  }
});

window.onload = () => {
  updateChatList();
  populateModels();
  adjustPadding();
  autoFocusInput();

  const deleteChatButton = document.getElementById("delete-chat");
  if (deleteChatButton) {
    deleteChatButton.addEventListener("click", deleteChat);
  }
  const newChatButton = document.getElementById("new-chat");
  if (newChatButton) {
    newChatButton.addEventListener("click", startNewChat);
  }
  const saveNameButton = document.getElementById("saveName");
  if (saveNameButton) {
    saveNameButton.addEventListener("click", saveChat);
  }
  const chatSelect = document.getElementById("chat-select");
  if (chatSelect) {
    chatSelect.addEventListener("change", loadSelectedChat);
  }
  const hostAddressInput = document.getElementById("host-address");
  if (hostAddressInput) {
    hostAddressInput.addEventListener("change", setHostAddress);
  }
  const systemPromptInput = document.getElementById("system-prompt");
  if (systemPromptInput) {
    systemPromptInput.addEventListener("change", setSystemPrompt);
  }
};

function deleteChat() {
  const selectedChat = document.getElementById("chat-select").value;
  localStorage.removeItem(selectedChat);
  updateChatList();
}

// Function to save chat with a unique name
function saveChat() {
  const chatName = document.getElementById("userName").value;

  // Close the modal
  const bootstrapModal = bootstrap.Modal.getInstance(
    document.getElementById("nameModal"),
  );
  bootstrapModal.hide();

  if (chatName === null || chatName.trim() === "") return;
  const history = document.getElementById("chat-history").innerHTML;
  const context = document.getElementById("chat-history").context;
  const systemPrompt = document.getElementById("system-prompt").value;
  const model = getSelectedModel();
  localStorage.setItem(
    chatName,
    JSON.stringify({
      history: history,
      context: context,
      system: systemPrompt,
      model: model,
    }),
  );
  updateChatList();
}

// Function to load selected chat from dropdown
function loadSelectedChat() {
  const selectedChat = document.getElementById("chat-select").value;
  const obj = JSON.parse(localStorage.getItem(selectedChat));
  document.getElementById("chat-history").innerHTML = obj.history;
  document.getElementById("chat-history").context = obj.context;
  document.getElementById("system-prompt").value = obj.system;
  updateModelInQueryString(obj.model);
  document.getElementById("chat-container").style.display = "block";
}

function startNewChat() {
  document.getElementById("chat-history").innerHTML = null;
  document.getElementById("chat-history").context = null;
  document.getElementById("chat-container").style.display = "none";
  updateChatList();
}

// Function to update chat list dropdown
function updateChatList() {
  const chatList = document.getElementById("chat-select");
  chatList.innerHTML =
    '<option value="" disabled selected>Select a chat</option>';
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === "host-address" || key == "system-prompt") continue;
    const option = document.createElement("option");
    option.value = key;
    option.text = key;
    chatList.add(option);
  }
}

function autoGrow(element) {
  const maxHeight = 200; // This should match the max-height set in CSS

  // Count the number of lines in the textarea based on newline characters
  const numberOfLines = $(element).val().split("\n").length;

  // Temporarily reset the height to auto to get the actual scrollHeight
  $(element).css("height", "auto");
  let newHeight = element.scrollHeight;

  // If content is one line, set the height to baseHeight
  if (numberOfLines === 1) {
    newHeight = textBoxBaseHeight;
  } else if (newHeight > maxHeight) {
    newHeight = maxHeight;
  }

  $(element).css("height", newHeight + "px");
}
