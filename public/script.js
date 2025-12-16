const API_URL = '/api';
let currentRole = null;
let canvas, ctx;
let isDrawing = false;

document.addEventListener('DOMContentLoaded', () => {
    fetchStatus();
    initCanvas();

    // Resize canvas capability
    window.addEventListener('resize', resizeCanvas);
});

async function fetchStatus() {
    try {
        const res = await fetch(`${API_URL}/status`);
        const data = await res.json();

        updatePartyState('partyA', data.partyA);
        updatePartyState('partyB', data.partyB);
    } catch (err) {
        console.error('Failed to fetch status', err);
    }
}

function updatePartyState(role, data) {
    const displayEl = document.getElementById(`display-${role}`);
    const metaEl = document.getElementById(`meta-${role}`);
    const btn = document.querySelector(`#block-${role} .btn-sign`);
    const stampEl = document.getElementById(`stamp-${role}`);
    const fingerprintEl = document.getElementById(`fingerprint-${role}`);
    const blockEl = document.getElementById(`block-${role}`);

    if (data && data.signature) {
        // Already signed
        displayEl.innerHTML = `<img src="${data.signature}" alt="Signature">`;
        metaEl.textContent = `签订日期：${new Date(data.date).toLocaleDateString()}`;
        btn.disabled = true;
        btn.textContent = '已签字 ✅';

        // Show stamp and fingerprint with animation
        stampEl.classList.add('show');
        setTimeout(() => {
            fingerprintEl.classList.add('show');
        }, 300);

        // Add signed class for celebration effect
        blockEl.classList.add('signed');
    } else {
        // Not signed
        displayEl.innerHTML = '';
        metaEl.textContent = '';
        btn.disabled = false;
        btn.textContent = role === 'partyA' ? '🤡 甲方签字 (不信邪)' : '😎 乙方签字 (稳如狗)';

        // Hide stamp and fingerprint
        stampEl.classList.remove('show');
        fingerprintEl.classList.remove('show');
        blockEl.classList.remove('signed');
    }
}

// Modal Logic
function openSignModal(role) {
    currentRole = role;
    const modal = document.getElementById('signModal');
    const title = document.getElementById('modalTitle');
    title.textContent = role === 'partyA' ? '甲方请签字' : '乙方请签字';
    modal.style.display = 'block';

    resizeCanvas(); // Ensure correct size when shown
    clearPad();
}

function closeModal() {
    document.getElementById('signModal').style.display = 'none';
    currentRole = null;
}

// Canvas Logic
function initCanvas() {
    canvas = document.getElementById('signaturePad');
    ctx = canvas.getContext('2d');

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    });
}

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight || 200;
}

function startDrawing(e) {
    isDrawing = true;
    ctx.beginPath();
    const { x, y } = getPos(e);
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
}

function draw(e) {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
}

function stopDrawing() {
    isDrawing = false;
    ctx.closePath();
}

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function clearPad() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function saveSignature() {
    if (!currentRole) return;

    // Check if empty (simple check: if dataURL is very short or identical to empty)
    // For now assuming user signs something

    const signatureData = canvas.toDataURL('image/png');
    const date = new Date().toISOString();

    try {
        const res = await fetch(`${API_URL}/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: currentRole,
                signature: signatureData,
                date: date
            })
        });

        const result = await res.json();
        if (result.success) {
            updatePartyState(currentRole, { signature: signatureData, date });
            closeModal();
            alert('签字成功！');
        } else {
            alert('签字失败，请重试');
        }
    } catch (err) {
        console.error('Error saving signature', err);
        alert('网络错误，请重试');
    }
}

// Close modal if clicked outside
window.onclick = function (event) {
    const modal = document.getElementById('signModal');
    if (event.target == modal) {
        closeModal();
    }
}
