const canvas = document.createElement('canvas');
canvas.id = 'bg-canvas';
document.body.insertBefore(canvas, document.body.firstChild);
const ctx = canvas.getContext('2d');
let width, height, particles = [], shockwaves = [];
const mouse = { x: null, y: null };
const colors = ['#4facfe', '#00f2fe', '#74ebd5', '#9b59b6', '#eb3b5a', '#f39c12'];

class Particle {
    constructor() {
        this.baseAngle = Math.random() * Math.PI * 2;
        this.baseRadius = Math.random() * (Math.max(window.innerWidth, window.innerHeight) / 1.5);
        this.x = window.innerWidth / 2 + Math.cos(this.baseAngle) * this.baseRadius;
        this.y = window.innerHeight / 2 + Math.sin(this.baseAngle) * this.baseRadius;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.length = Math.random() * 5 + 2;
        this.thickness = Math.random() * 1.5 + 1;
        this.zOffset = Math.random() * 2 - 1;
        this.orbitSpeed = 0.0003 * (1 + this.zOffset * 0.5) * (Math.random() < 0.5 ? 1 : -1);
        this.vx = 0; this.vy = 0;
    }
    update() {
        let cx = width / 2, cy = height / 2;
        this.baseAngle += this.orbitSpeed;
        let bx = cx + Math.cos(this.baseAngle) * this.baseRadius;
        let by = cy + Math.sin(this.baseAngle) * this.baseRadius;
        
        let px = 0, py = 0;
        if (mouse.x != null) {
            let mdx = mouse.x - cx, mdy = mouse.y - cy;
            px = (mdx * -0.03) * this.zOffset; py = (mdy * -0.03) * this.zOffset;
            let ldx = mouse.x - (bx + px), ldy = mouse.y - (by + py);
            let ldist = Math.sqrt(ldx * ldx + ldy * ldy);
            if (ldist < 200) {
                let force = Math.pow((200 - ldist) / 200, 2);
                bx -= (ldx / ldist) * force * 50; by -= (ldy / ldist) * force * 50;
            }
        }
        for (let s of shockwaves) {
            let sdx = s.x - (bx + px), sdy = s.y - (by + py);
            let sdist = Math.sqrt(sdx * sdx + sdy * sdy);
            if (sdist < s.radius && sdist > s.radius - s.thickness) {
                let force = s.power * Math.pow(1 - s.radius / s.maxRadius, 2);
                bx -= (sdx / sdist) * force * 20; by -= (sdy / sdist) * force * 20;
            }
        }
        this.vx += (bx + px - this.x) * 0.08; this.vy += (by + py - this.y) * 0.08;
        this.vx *= 0.8; this.vy *= 0.8;
        this.x += this.vx; this.y += this.vy;
    }
    draw() {
        let maxDist = Math.max(width, height) / 1.5, opacity = 1;
        if (this.baseRadius > maxDist - 200) opacity = Math.max(0, (maxDist - this.baseRadius) / 200);
        if (this.baseRadius < 30) opacity = this.baseRadius / 30;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
        ctx.translate(this.x, this.y);
        ctx.rotate(this.baseAngle + Math.PI / 4); 
        ctx.beginPath();
        ctx.lineCap = 'round'; ctx.lineWidth = this.thickness; ctx.strokeStyle = this.color;
        ctx.moveTo(-this.length/2, 0); ctx.lineTo(this.length/2, 0); ctx.stroke();
        ctx.restore();
    }
}
function initParticles() {
    particles = Array.from({length: Math.floor((width * height) / 7000)}, () => new Particle());
}
function resize() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; initParticles(); }
window.addEventListener('resize', resize);
function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        shockwaves[i].radius += shockwaves[i].speed;
        if (shockwaves[i].radius > shockwaves[i].maxRadius) shockwaves.splice(i, 1);
    }
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
}
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });
window.addEventListener('click', e => shockwaves.push({ x: e.clientX, y: e.clientY, radius: 0, maxRadius: 400, speed: 18, thickness: 60, power: 12 }));
resize(); animate();

// --- Calculator Logic ---
const display = document.getElementById('display');
const history = document.getElementById('history');
const themeSwitch = document.getElementById('theme-switch');

let currentInput = '0';
let currentHistory = '';
let isNewCalculation = true;
let currentTab = 'standard';
let cursorPos = 1;

themeSwitch.addEventListener('change', () => document.body.classList.replace(themeSwitch.checked ? 'light-theme' : 'dark-theme', themeSwitch.checked ? 'dark-theme' : 'light-theme'));

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        
        ['calc-body', 'sci-rows', 'convert-body', 'calc-screen', 'conv-screen'].forEach(id => document.getElementById(id).classList.add('hidden'));
        
        if (currentTab === 'standard') {
            document.getElementById('calc-body').classList.remove('hidden');
            document.getElementById('calc-screen').classList.remove('hidden');
        } else if (currentTab === 'scientific') {
            document.getElementById('calc-body').classList.remove('hidden');
            document.getElementById('sci-rows').classList.remove('hidden');
            document.getElementById('calc-screen').classList.remove('hidden');
        } else {
            document.getElementById('convert-body').classList.remove('hidden');
            document.getElementById('conv-screen').classList.remove('hidden');
            if (!document.getElementById('conv-unit-1').innerHTML) changeCategory();
        }
    });
});

// Cursor Renderer
function renderCursor(container, text, pos, isConvBox = false) {
    container.innerHTML = '';
    pos = Math.max(0, Math.min(pos, text.length));
    
    for (let i = 0; i <= text.length; i++) {
        if (i === pos && (!isConvBox || activeConvBox === parseInt(container.id.slice(-1)))) {
            const cursor = document.createElement('span');
            cursor.className = 'virtual-cursor';
            container.appendChild(cursor);
        }
        if (i < text.length) {
            const charSpan = document.createElement('span');
            charSpan.innerText = text[i] === ' ' ? '\u00A0' : text[i];
            charSpan.className = 'disp-char';
            charSpan.onclick = (e) => {
                e.stopPropagation();
                if (isConvBox) setActiveBox(parseInt(container.id.slice(-1)));
                const rect = charSpan.getBoundingClientRect();
                const newPos = (e.clientX - rect.left) < rect.width / 2 ? i : i + 1;
                if (isConvBox) { convCursor[activeConvBox] = newPos; updateConvDisplay(false); }
                else { cursorPos = newPos; updateDisplay(); }
            };
            container.appendChild(charSpan);
        }
    }
    const cEl = container.querySelector('.virtual-cursor');
    if (cEl) {
        let left = cEl.offsetLeft, scroll = container.scrollLeft, width = container.clientWidth;
        if (left < scroll) container.scrollLeft = Math.max(0, left - 20);
        else if (left > scroll + width - 20) container.scrollLeft = left - width + 20;
    }
}

// Click blank space to move cursor to end
display.onclick = () => { cursorPos = currentInput.length; updateDisplay(); };

function updateDisplay() {
    renderCursor(display, currentInput, cursorPos);
    history.innerText = currentHistory;
}

function appendNumber(num) {
    num = num.toString();
    if (isNewCalculation) {
        currentInput = num; cursorPos = num.length; isNewCalculation = false;
    } else {
        if (currentInput === '0' && num !== '.') { currentInput = num; cursorPos = num.length; }
        else {
            currentInput = currentInput.slice(0, cursorPos) + num + currentInput.slice(cursorPos);
            cursorPos += num.length;
        }
    }
    updateDisplay();
}

function appendOperator(op) {
    isNewCalculation = false;
    const lastCharIndex = cursorPos - 1;
    if (currentInput[lastCharIndex] && ['+', '-', '*', '/', '%'].includes(currentInput[lastCharIndex])) {
        currentInput = currentInput.slice(0, lastCharIndex) + op + currentInput.slice(cursorPos);
    } else {
        currentInput = currentInput.slice(0, cursorPos) + op + currentInput.slice(cursorPos);
        cursorPos += op.length;
    }
    updateDisplay();
}

function clearDisplay() { currentInput = '0'; currentHistory = ''; cursorPos = 1; isNewCalculation = true; updateDisplay(); }

function backspace() {
    if (cursorPos > 0) {
        if (currentInput.length === 1) { currentInput = '0'; cursorPos = 1; }
        else {
            currentInput = currentInput.slice(0, cursorPos - 1) + currentInput.slice(cursorPos);
            cursorPos--;
            if (!currentInput) { currentInput = '0'; cursorPos = 1; }
        }
        updateDisplay();
    }
}

function calculate() {
    try {
        let res = eval(currentInput.replace(/×/g, '*').replace(/÷/g, '/').replace(/%/g, '/100'));
        currentHistory = currentInput + ' =';
        currentInput = res.toString(); cursorPos = currentInput.length;
        isNewCalculation = true; updateDisplay();
    } catch { currentInput = 'Error'; cursorPos = 5; isNewCalculation = true; updateDisplay(); }
}

function appendSci(func) {
    let val = parseFloat(currentInput); if(isNaN(val)) return;
    let res = val;
    switch(func) {
        case 'sqrt': res = Math.sqrt(val); break;
        case 'cbrt': res = Math.cbrt(val); break;
        case 'sin': res = Math.sin(val * Math.PI / 180); break; 
        case 'cos': res = Math.cos(val * Math.PI / 180); break; 
        case 'tan': res = Math.tan(val * Math.PI / 180); break;
        case 'log': res = Math.log10(val); break;
        case 'ln': res = Math.log(val); break;
        case 'pow': currentInput = currentInput.slice(0, cursorPos) + '**' + currentInput.slice(cursorPos); cursorPos += 2; updateDisplay(); return;
    }
    currentHistory = `${func}(${currentInput})`;
    currentInput = res.toFixed(8).replace(/\.?0+$/, ''); 
    cursorPos = currentInput.length; isNewCalculation = true; updateDisplay();
}

function appendScientificConst(c) {
    let num = (c === 'PI' ? Math.PI : Math.E).toFixed(10).toString();
    appendNumber(num);
}

// --- Conversions System ---
const convOptions = {
    length: [{val:'m',text:'m (Meter)'},{val:'cm',text:'cm (Centimeter)'},{val:'km',text:'km (Kilometer)'},{val:'in',text:'in (Inch)'},{val:'ft',text:'ft (Foot)'},{val:'mi',text:'mi (Mile)'}],
    weight: [{val:'kg',text:'kg (Kilogram)'},{val:'g',text:'g (Gram)'},{val:'lb',text:'lb (Pound)'},{val:'oz',text:'oz (Ounce)'}],
    area: [{val:'m2',text:'m² (Sq. Meter)'},{val:'cm2',text:'cm² (Sq. Centimeter)'},{val:'ft2',text:'ft² (Sq. Foot)'},{val:'in2',text:'in² (Sq. Inch)'},{val:'ha',text:'ha (Hectare)'},{val:'ac',text:'ac (Acre)'}],
    temp: [{val:'c',text:'°C (Celsius)'},{val:'f',text:'°F (Fahrenheit)'},{val:'k',text:'K (Kelvin)'}]
};
const convRates = {
    length: { m: 1, cm: 0.01, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.34 },
    weight: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495 },
    area: { m2: 1, cm2: 0.0001, ft2: 0.092903, in2: 0.00064516, ha: 10000, ac: 4046.86 }
};

let activeConvBox = 1;
let convInputs = { 1: '1', 2: '0' };
let convCursor = { 1: 1, 2: 1 };
let isNewConvValue = true;

document.getElementById('conv-val-1').onclick = () => { setActiveBox(1); convCursor[1] = convInputs[1].length; updateConvDisplay(false); };
document.getElementById('conv-val-2').onclick = () => { setActiveBox(2); convCursor[2] = convInputs[2].length; updateConvDisplay(false); };

function buildUnitDropdowns() {
    let opts = convOptions[document.getElementById('conv-category').value];
    let html = opts.map(o => `<option value="${o.val}">${o.text}</option>`).join('');
    let u1 = document.getElementById('conv-unit-1'), u2 = document.getElementById('conv-unit-2');
    u1.innerHTML = u2.innerHTML = html;
    if (opts.length > 1) { u1.selectedIndex = 0; u2.selectedIndex = 1; }
}

function changeCategory() {
    buildUnitDropdowns(); convInputs[1] = '1'; convInputs[2] = '0'; convCursor[1] = 1;
    isNewConvValue = true; setActiveBox(1); updateConvDisplay(true);
}

function setActiveBox(box) {
    activeConvBox = box;
    document.getElementById('conv-box-1').classList.toggle('active', box === 1);
    document.getElementById('conv-box-2').classList.toggle('active', box === 2);
    isNewConvValue = true;
}

function swapConv() {
    let u1 = document.getElementById('conv-unit-1'), u2 = document.getElementById('conv-unit-2');
    [u1.value, u2.value] = [u2.value, u1.value];
    calculateConv();
}

function appendConv(val) {
    if (isNewConvValue) {
        convInputs[activeConvBox] = val === '.' ? '0.' : val;
        convCursor[activeConvBox] = convInputs[activeConvBox].length;
        isNewConvValue = false;
    } else {
        let cur = convInputs[activeConvBox], pos = convCursor[activeConvBox];
        if (cur === '0' && val !== '.') { convInputs[activeConvBox] = val; convCursor[activeConvBox] = val.length; }
        else {
            if (val === '.' && cur.includes('.')) return;
            convInputs[activeConvBox] = cur.slice(0, pos) + val + cur.slice(pos);
            convCursor[activeConvBox] += val.length;
        }
    }
    updateConvDisplay(true);
}

function clearConv() { convInputs[activeConvBox] = '0'; convCursor[activeConvBox] = 1; isNewConvValue = true; updateConvDisplay(true); }

function backspaceConv() {
    let cur = convInputs[activeConvBox], pos = convCursor[activeConvBox];
    if (pos > 0) {
        if (cur.length === 1) { convInputs[activeConvBox] = '0'; convCursor[activeConvBox] = 1; isNewConvValue = true; }
        else {
            convInputs[activeConvBox] = cur.slice(0, pos - 1) + cur.slice(pos);
            convCursor[activeConvBox]--;
            if (!convInputs[activeConvBox]) { convInputs[activeConvBox] = '0'; convCursor[activeConvBox] = 1; isNewConvValue = true; }
        }
    }
    updateConvDisplay(true);
}

function calculateConv() {
    let cat = document.getElementById('conv-category').value, fromBox = activeConvBox, toBox = fromBox === 1 ? 2 : 1;
    let baseStr = convInputs[fromBox];
    if (!baseStr || baseStr === '.') { convInputs[toBox] = '0'; convCursor[toBox]=1; updateConvDisplay(false); return; }
    
    let baseVal = parseFloat(baseStr), fromU = document.getElementById(`conv-unit-${fromBox}`).value, toU = document.getElementById(`conv-unit-${toBox}`).value, res = 0;
    if (cat === 'temp') {
        let c = baseVal;
        if (fromU === 'f') c = (baseVal - 32) * 5/9; if (fromU === 'k') c = baseVal - 273.15;
        res = c;
        if (toU === 'f') res = (c * 9/5) + 32; if (toU === 'k') res = c + 273.15;
    } else res = (baseVal * convRates[cat][fromU]) / convRates[cat][toU];
    
    convInputs[toBox] = Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(6)).toString();
    convCursor[toBox] = convInputs[toBox].length;
    updateConvDisplay(false);
}

function updateConvDisplay(calcAlso = false) {
    if (calcAlso) calculateConv();
    renderCursor(document.getElementById('conv-val-1'), convInputs[1] || '0', convCursor[1], true);
    renderCursor(document.getElementById('conv-val-2'), convInputs[2] || '0', convCursor[2], true);
}
window.addEventListener('load', () => changeCategory());

// Keyboard Listener
window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return; 
    let t = currentTab === 'convert';
    
    if (e.key === 'ArrowLeft') {
        if (t) { if (convCursor[activeConvBox] > 0) convCursor[activeConvBox]--; updateConvDisplay(false); }
        else { if (cursorPos > 0) cursorPos--; updateDisplay(); }
    }
    if (e.key === 'ArrowRight') {
        if (t) { if (convCursor[activeConvBox] < convInputs[activeConvBox].length) convCursor[activeConvBox]++; updateConvDisplay(false); }
        else { if (cursorPos < currentInput.length) cursorPos++; updateDisplay(); }
    }
    
    if (t) {
        if (e.key >= '0' && e.key <= '9') appendConv(e.key);
        if (e.key === '.') appendConv('.');
        if (e.key === 'Backspace') backspaceConv();
        if (e.key === 'Escape') clearConv();
    } else {
        if (e.key >= '0' && e.key <= '9') appendNumber(e.key);
        if (e.key === '.') appendNumber('.');
        if (['+','-','*','/','%'].includes(e.key)) appendOperator(e.key);
        if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calculate(); }
        if (e.key === 'Backspace') backspace();
        if (e.key === 'Escape') clearDisplay();
    }
});

updateDisplay();
