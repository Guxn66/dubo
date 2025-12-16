const API_URL = '/api';
let currentRole = null;
let canvas, ctx;
let isDrawing = false;

document.addEventListener('DOMContentLoaded', () => {
    fetchStatus();
    initCanvas();
    initCountdown();

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

    if (data && data.signature) {
        // Already signed
        displayEl.innerHTML = `<img src="${data.signature}" alt="签名">`;
        metaEl.textContent = `签署日期：${new Date(data.date).toLocaleDateString('zh-CN')}`;
        btn.disabled = true;
        btn.textContent = '已签署';

        // Show stamp
        if (stampEl) stampEl.classList.add('show');
    } else {
        // Not signed
        displayEl.innerHTML = '';
        metaEl.textContent = '';
        btn.disabled = false;
        btn.textContent = role === 'partyA' ? '甲方签字' : '乙方签字';

        // Hide stamp
        if (stampEl) stampEl.classList.remove('show');
    }
}

// Modal Logic
function openSignModal(role) {
    currentRole = role;
    const modal = document.getElementById('signModal');
    const title = document.getElementById('modalTitle');
    title.textContent = role === 'partyA' ? '甲方请签字' : '乙方请签字';
    modal.style.display = 'block';

    // 延迟执行确保模态框完全渲染后再调整canvas尺寸
    setTimeout(() => {
        resizeCanvas();
        clearPad();
    }, 50);
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
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 移动端全屏时使用容器实际尺寸
    canvas.width = containerWidth || 300;
    canvas.height = containerHeight || 200;

    // 确保最小高度
    if (canvas.height < 150) {
        canvas.height = 200;
    }
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

// Countdown Logic
function initCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    // 赌局截止时间：2026年3月16日 24:00 (即2026年3月17日 00:00)
    const targetDate = new Date('2026-03-17T00:00:00+08:00');
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
        // 时间到了
        document.getElementById('days').textContent = '00';
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

// 下载功能
async function downloadAsImage() {
    const container = document.querySelector('.container');
    const downloadSection = document.querySelector('.download-section');

    // 临时隐藏下载按钮
    downloadSection.style.display = 'none';

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        const link = document.createElement('a');
        link.download = '生死对赌协议.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error('下载失败', err);
        alert('下载失败，请重试');
    } finally {
        downloadSection.style.display = '';
    }
}

async function downloadAsPDF() {
    const container = document.querySelector('.container');
    const downloadSection = document.querySelector('.download-section');

    // 临时隐藏下载按钮
    downloadSection.style.display = 'none';

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        const { jsPDF } = window.jspdf;
        const imgData = canvas.toDataURL('image/png');

        // 计算PDF尺寸 (A4)
        const imgWidth = 210; // A4宽度 mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF('p', 'mm', 'a4');

        // 如果内容超过一页，需要分页
        const pageHeight = 297; // A4高度 mm
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('生死对赌协议.pdf');
    } catch (err) {
        console.error('下载失败', err);
        alert('下载失败，请重试');
    } finally {
        downloadSection.style.display = '';
    }
}
