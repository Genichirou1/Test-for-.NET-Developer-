const SOAP_URL = 'http://isapi.mekashron.com/icu-tech/icutech-test.dll/soap/IICUTech';
const CORS_PROXY = 'https://corsproxy.io/?';
const form = document.getElementById('loginForm');
const msgContainer = document.getElementById('message-container');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');

/**
 * Display a message in the message container
 * @param {string} msg - Message text
 * @param {string} type - 'success' or 'danger'
 * @param {string|null} details - Optional JSON details
 */
function showMessage(msg, type, details = null) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    let html = `<div class="alert ${alertClass}" role="alert">${msg}`;
    if(details){
        html += `<div class="entity-details"><pre>${details}</pre></div>`;
    }
    html += `</div>`;
    msgContainer.innerHTML = html;

    // Scroll the message into view smoothly
    setTimeout(() => msgContainer.firstChild?.scrollIntoView({behavior:'smooth', block:'nearest'}), 100);
}

/**
 * Set loading state for the submit button
 * @param {boolean} isLoading
 */
function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.innerHTML = isLoading ? '<span class="spinner"></span>Signing in...' : 'Sign In';
}

/**
 * Get the public IP of the user
 * @returns {Promise<string>} - IP address or '0.0.0.0' on error
 */
function getUserIP() {
    return fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(data => data.ip)
        .catch(() => '0.0.0.0');
}

/**
 * Call SOAP Login function with given username and password
 * @param {string} username
 * @param {string} password
 * @returns {Promise<string>} - SOAP response content
 */
async function callSOAP(username, password) {
    const userIP = await getUserIP();

    // Build SOAP XML envelope
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope 
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" 
    xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <SOAP-ENV:Body>
        <NS1:Login xmlns:NS1="urn:ICUTech.Intf-IICUTech">
            <UserName xsi:type="xsd:string">${username}</UserName>
            <Password xsi:type="xsd:string">${password}</Password>
            <IPs xsi:type="xsd:string">${userIP}</IPs>
        </NS1:Login>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

    // Send SOAP request via CORS proxy
    const response = await fetch(CORS_PROXY + encodeURIComponent(SOAP_URL), {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': 'urn:ICUTech.Intf-IICUTech#Login'
        },
        body: soapEnvelope
    });

    if(!response.ok) throw new Error(`HTTP error: ${response.status}`);

    // Parse SOAP response
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const returnNode = xml.getElementsByTagName('return')[0];
    if(!returnNode) throw new Error('Invalid SOAP response');

    return returnNode.textContent;
}

// Handle login form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgContainer.innerHTML = '';
    setLoading(true);

    try {
        const login = document.getElementById('login').value.trim();
        const password = document.getElementById('password').value;

        // Attempt to login
        const result = await callSOAP(login, password);

        // Parse result as JSON
        let userData;
        try { 
            userData = JSON.parse(result); 
        } catch { 
            userData = null; 
        }

        // Check if user was found
        if(userData && userData.EntityId){
            showMessage('Login successful! User found.', 'success', JSON.stringify(userData, null, 2));
        } else {
            showMessage('Login failed: Invalid credentials', 'danger', result);
        }
    } catch(err) {
        showMessage('Error: ' + err.message, 'danger');
    } finally {
        setLoading(false);
    }
});
