/**
 * Sistema MFA - Autenticación Multifactor
 * Frontend optimizado para 3 capas de seguridad
 */

const MFA_STATE = {
  currentUser: null,
  accessToken: null,
  refreshToken: null
};

async function api(path, body = null, options = {}) {
  const config = {
    method: options.method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...options.headers }
  };
  if (MFA_STATE.accessToken && !options.skipAuth) {
    config.headers['Authorization'] = `Bearer ${MFA_STATE.accessToken}`;
  }
  if (body) config.body = JSON.stringify(body);
  
  try {
    const res = await fetch(path, config);
    const data = await res.json();
    console.log('[DEBUG] Response status:', res.status);
    console.log('[DEBUG] Response data:', data);
    if (res.status === 429) {
      showToast('Demasiadas peticiones. Espera un momento.', 'warning');
      return { error: 'rate_limit_exceeded' };
    }
    return data;
  } catch (error) {
    showToast('Error de conexión', 'danger');
    return { error: 'network_error' };
  }
}

function saveSession(userData, accessToken, refreshToken) {
  MFA_STATE.currentUser = userData;
  MFA_STATE.accessToken = accessToken;
  MFA_STATE.refreshToken = refreshToken;
  localStorage.setItem('mfa_user', JSON.stringify(userData));
  localStorage.setItem('mfa_access_token', accessToken);
  localStorage.setItem('mfa_refresh_token', refreshToken);
}

function loadSession() {
  try {
    const user = localStorage.getItem('mfa_user');
    const accessToken = localStorage.getItem('mfa_access_token');
    const refreshToken = localStorage.getItem('mfa_refresh_token');
    
    if (user && accessToken) {
      const userData = JSON.parse(user);
      
      // Validar que los datos sean válidos
      if (userData && userData.username && userData.email) {
        MFA_STATE.currentUser = userData;
        MFA_STATE.accessToken = accessToken;
        MFA_STATE.refreshToken = refreshToken;
        return true;
      } else {
        localStorage.clear();
      }
    }
  } catch (error) {
    localStorage.clear();
  }
  return false;
}

async function logout() {
  if (MFA_STATE.accessToken) {
    try {
      await api('/api/logout', { token: MFA_STATE.accessToken });
    } catch (error) {
      // Ignorar errores del servidor
    }
  }
  
  // Limpiar completamente el estado
  MFA_STATE.currentUser = null;
  MFA_STATE.accessToken = null;
  MFA_STATE.refreshToken = null;
  localStorage.clear();
  sessionStorage.clear();
  
  // Redirigir a la página de sistema con parámetro logout
  if (window.location.pathname.includes('dashboard.html')) {
    window.location.href = '/system.html?logout=true';
  } else {
    // Si ya estamos en system.html, recargar la página con el parámetro
    window.location.href = '/system.html?logout=true';
  }
}

const app = document.getElementById('app');

// Helper para obtener el stepper
function getStepper() { 
  return document.getElementById('mfa_stepper'); 
}

// Las funciones setStepActive y setStepCompleted están definidas en system.html
// No necesitamos redefinirlas aquí

function showRegister() {
  const stepper = getStepper();
  if (stepper) { stepper.style.display = 'flex'; setStepActive(1); }
  
  app.innerHTML = `
    <form id="register_form" class="mb-3">
      <div class="mb-3">
        <label class="form-label">Usuario</label>
        <input id="r_user" class="form-control" required>
      </div>
      <div class="mb-3">
        <label class="form-label">Email</label>
        <input id="r_email" type="email" class="form-control" required>
      </div>
      <div class="mb-3">
        <label class="form-label">Contraseña</label>
        <input id="r_pass" type="password" class="form-control" required>
      </div>
      <div class="d-flex justify-content-between">
        <a href="#" id="to_login">Ir a Login</a>
        <button id="r_btn" class="btn btn-primary">Registrar</button>
      </div>
    </form>
    <div id="reg_info"></div>
  `;
  
  document.getElementById('register_form').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('r_user').value.trim();
    const email = document.getElementById('r_email').value.trim();
    const password = document.getElementById('r_pass').value;
    
    const btn = document.getElementById('r_btn');
    btn.disabled = true;
    btn.textContent = 'Registrando...';
    
    const res = await api('/api/register', { username, password, email });
    const info = document.getElementById('reg_info');
    info.innerHTML = '';
    
    btn.disabled = false;
    btn.textContent = 'Registrar';
    
    if (res.ok) {
      setStepCompleted(1);
      const container = document.createElement('div');
      container.className = 'alert alert-success text-center';
      container.innerHTML = `
        <h5 class="mb-4">✅ Registro Exitoso</h5>
        <p class="text-muted">Configura tu autenticación de dos factores</p>
      `;
      
      // Mostrar QR y Secret Key
      if (res.otpauth_uri && res.totp_secret) {
        // Usar QR Server API (más confiable que Google Charts)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(res.otpauth_uri)}`;
        
        container.innerHTML += `
          <div class="card mt-3 mx-auto shadow-sm" style="max-width: 420px;">
            <div class="card-body p-4">
              <h6 class="card-title text-center mb-3">
                <i class="bi bi-qr-code text-primary"></i> Escanea este código QR
              </h6>
              <div class="text-center my-3">
                <img src="${qrUrl}" alt="QR Code" class="img-fluid rounded shadow-sm" style="max-width: 250px;">
              </div>
              <p class="small text-muted text-center mb-3">
                <i class="bi bi-phone"></i> Usa Google Authenticator, Authy o similar
              </p>
              
              <hr class="my-3">
              
              <h6 class="text-center">O ingresa la clave manualmente:</h6>
              <div class="input-group mt-2">
                <input type="text" class="form-control text-center fw-bold" value="${res.totp_secret}" readonly id="secretKey">
                <button class="btn btn-outline-primary" onclick="navigator.clipboard.writeText('${res.totp_secret}'); showToast('✅ Clave copiada', 'success')">
                  <i class="bi bi-clipboard"></i> Copiar
                </button>
              </div>
            </div>
          </div>
        `;
      }
      
      // Códigos de respaldo - GUARDAR EN localStorage
      if (res.backup_codes && res.backup_codes.length > 0) {
        // Guardar en localStorage con el username como clave
        localStorage.setItem(`backup_codes_${username}`, JSON.stringify(res.backup_codes));
        
        container.innerHTML += `
          <div class="alert alert-warning mt-3">
            <h6><i class="bi bi-shield-exclamation"></i> Códigos de Respaldo</h6>
            <p class="small">Guárdalos en un lugar seguro. Cada uno puede usarse una sola vez.</p>
            <div class="row g-2">
              ${res.backup_codes.map(code => `
                <div class="col-6">
                  <code class="d-block p-2 bg-light rounded">${code}</code>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      const btnLogin = document.createElement('button');
      btnLogin.className = 'btn btn-primary btn-lg mt-3 w-100';
      btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Continuar al Login';
      btnLogin.onclick = () => showLogin();
      container.appendChild(btnLogin);
      
      info.appendChild(container);
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      
      showToast('Usuario registrado', 'success');
    } else {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger';
      alert.textContent = 'Error: ' + (res.error || 'unknown');
      info.appendChild(alert);
    }
  };
  
  document.getElementById('to_login').onclick = (e) => { e.preventDefault(); showLogin(); };
}

function showLogin() {
  const stepper = getStepper();
  if (stepper) { stepper.style.display = 'flex'; setStepActive(1); }
  
  app.innerHTML = `
    <form id="login_form">
      <div class="mb-3">
        <label class="form-label">Usuario</label>
        <input id="l_user" class="form-control" required>
      </div>
      <div class="mb-3">
        <label class="form-label">Contraseña</label>
        <div class="input-group">
          <input id="l_pass" type="password" class="form-control" required>
          <button class="btn btn-outline-secondary" type="button" id="togglePassword">
            <i class="bi bi-eye" id="eyeIcon"></i>
          </button>
        </div>
      </div>
      <div class="d-flex justify-content-between">
        <a href="#" id="to_register">Registrarse</a>
        <button id="l_btn" class="btn btn-primary">Login</button>
      </div>
    </form>
    <div id="login_info" class="mt-3"></div>
  `;
  
  // Toggle password visibility
  document.getElementById('togglePassword').onclick = () => {
    const passInput = document.getElementById('l_pass');
    const eyeIcon = document.getElementById('eyeIcon');
    if (passInput.type === 'password') {
      passInput.type = 'text';
      eyeIcon.className = 'bi bi-eye-slash';
    } else {
      passInput.type = 'password';
      eyeIcon.className = 'bi bi-eye';
    }
  };
  
  document.getElementById('login_form').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('l_user').value.trim();
    const password = document.getElementById('l_pass').value;
    
    const btn = document.getElementById('l_btn');
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    
    const res = await api('/api/login', { username, password }, { skipAuth: true });
    const info = document.getElementById('login_info');
    info.innerHTML = '';
    
    btn.disabled = false;
    btn.textContent = 'Login';
    
    // Verificar si es admin con acceso directo
    if (res.ok && res.admin_access) {
      saveSession(res.user, res.access_token, res.refresh_token);
      setStepCompleted(1);
      setStepCompleted(2);
      setStepCompleted(3);
      showToast('¡Bienvenido Admin!', 'success');
      setTimeout(() => {
        window.location.href = `/dashboard.html?user=${res.user.username}&email=${res.user.email}`;
      }, 500);
      return;
    }
    
    if (res.ok && res.require_totp) {
      setStepCompleted(1);
      showTotp(username);
      showToast('Contraseña correcta', 'success');
    } else {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger';
      alert.textContent = 'Error: ' + (res.error || 'Credenciales inválidas');
      info.appendChild(alert);
    }
  };
  
  document.getElementById('to_register').onclick = (e) => { e.preventDefault(); showRegister(); };
}

function showTotp(username) {
  const stepper = getStepper();
  if (stepper) { stepper.style.display = 'flex'; setStepActive(2); }
  
  app.innerHTML = `
    <form id="totp_form">
      <div class="mb-2"><strong>Usuario:</strong> ${username}</div>
      <div class="mb-3">
        <label class="form-label">Código TOTP</label>
        <input id="t_token" class="form-control" placeholder="123456" maxlength="6" required>
      </div>
      <div class="mb-3">
        <button id="use_backup" type="button" class="btn btn-link btn-sm p-0">
          ¿Perdiste tu teléfono? Usar código de backup
        </button>
      </div>
      <button id="t_btn" class="btn btn-primary">Verificar TOTP</button>
    </form>
    <div id="t_info" class="mt-3"></div>
  `;
  
  document.getElementById('totp_form').onsubmit = async (e) => {
    e.preventDefault();
    const token = document.getElementById('t_token').value.trim();
    
    const btn = document.getElementById('t_btn');
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    
    const res = await api('/api/verify_totp', { username, token }, { skipAuth: true });
    const info = document.getElementById('t_info');
    info.innerHTML = '';
    
    btn.disabled = false;
    btn.textContent = 'Verificar TOTP';
    
    if (res.ok && res.require_email_otp) {
      setStepCompleted(2);
      await api('/api/send_email_otp', { username }, { skipAuth: true });
      showEmailOtp(username);
      showToast('TOTP correcto', 'success');
    } else {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger';
      alert.textContent = 'Error: ' + (res.error || 'Código TOTP inválido');
      info.appendChild(alert);
    }
  };
  
  document.getElementById('use_backup').onclick = () => showBackupCodeVerification(username);
}

function showBackupCodeVerification(username) {
  app.innerHTML = `
    <form id="backup_form">
      <div class="mb-2"><strong>Usuario:</strong> ${username}</div>
      <div class="alert alert-warning">
        <strong>⚠️ Código de Recuperación</strong>
        <p class="mb-0">Ingresa uno de tus códigos de backup</p>
      </div>
      <div class="mb-3">
        <label class="form-label">Código de Backup</label>
        <input id="b_code" class="form-control" placeholder="1234-5678-9012" required>
      </div>
      <div class="d-flex justify-content-between">
        <button type="button" class="btn btn-secondary" id="back_totp">Volver a TOTP</button>
        <button id="b_btn" class="btn btn-primary">Verificar</button>
      </div>
    </form>
    <div id="b_info" class="mt-3"></div>
  `;
  
  document.getElementById('backup_form').onsubmit = async (e) => {
    e.preventDefault();
    const code = document.getElementById('b_code').value.trim();
    
    const btn = document.getElementById('b_btn');
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    
    const res = await api('/api/verify_backup_code', { username, code }, { skipAuth: true });
    const info = document.getElementById('b_info');
    info.innerHTML = '';
    
    btn.disabled = false;
    btn.textContent = 'Verificar';
    
    if (res.ok && res.require_email_otp) {
      setStepCompleted(2);
      await api('/api/send_email_otp', { username }, { skipAuth: true });
      showEmailOtp(username);
      showToast('Código válido', 'success');
    } else {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger';
      alert.textContent = 'Error: ' + (res.error || 'Código inválido');
      info.appendChild(alert);
    }
  };
  
  document.getElementById('back_totp').onclick = () => showTotp(username);
}

function showEmailOtp(username) {
  const stepper = getStepper();
  if (stepper) { stepper.style.display = 'flex'; setStepActive(3); }
  
  app.innerHTML = `
    <h5>Verificación por Email</h5>
    <p>Se envió un código OTP a tu email.</p>
    <form id="email_form">
      <div class="mb-3">
        <label class="form-label">Código OTP</label>
        <input id="e_token" class="form-control" placeholder="123456" maxlength="6" required>
      </div>
      <div class="d-flex justify-content-between">
        <button id="view_outbox" type="button" class="btn btn-outline-secondary btn-sm">
          Ver Outbox
        </button>
        <button id="e_btn" class="btn btn-primary">Verificar</button>
      </div>
    </form>
    <div id="e_info" class="mt-3"></div>
  `;
  
  document.getElementById('email_form').onsubmit = async (e) => {
    e.preventDefault();
    const token = document.getElementById('e_token').value.trim();
    
    const btn = document.getElementById('e_btn');
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    
    const res = await api('/api/verify_email', { username, token }, { skipAuth: true });
    const info = document.getElementById('e_info');
    info.innerHTML = '';
    
    btn.disabled = false;
    btn.textContent = 'Verificar';
    
    if (res.ok && res.authenticated) {
      setStepCompleted(3);
      if (res.access_token && res.user) {
        saveSession(res.user, res.access_token, res.refresh_token);
      }
      showToast('¡Autenticación completada!', 'success');
      
      setTimeout(() => {
        window.location.href = `/dashboard.html?user=${res.user.username}&email=${res.user.email}`;
      }, 500);
    } else {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger';
      alert.textContent = 'Error: ' + (res.error || 'Código OTP inválido');
      info.appendChild(alert);
    }
  };
  
  document.getElementById('view_outbox').onclick = async () => {
    const resp = await fetch('/api/outbox');
    const text = await resp.text();
    document.getElementById('outboxContent').textContent = text || 'Outbox vacío';
    const modal = new bootstrap.Modal(document.getElementById('outboxModal'));
    modal.show();
  };
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  
  container.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
  bsToast.show();
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

document.addEventListener('DOMContentLoaded', () => {
  // Verificar si venimos de un logout (parámetro en URL)
  const urlParams = new URLSearchParams(window.location.search);
  const fromLogout = urlParams.get('logout') === 'true';
  
  // Si venimos de logout, limpiar TODA la sesión
  if (fromLogout) {
    localStorage.clear();
    sessionStorage.clear();
    MFA_STATE.currentUser = null;
    MFA_STATE.accessToken = null;
    MFA_STATE.refreshToken = null;
    
    // Limpiar el parámetro de la URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Mostrar login con mensaje de sesión cerrada
    showLogin();
    setTimeout(() => {
      showToast('Sesión cerrada exitosamente', 'success');
    }, 300);
  } else if (loadSession()) {
    // Si hay sesión válida, redirigir a dashboard
    const user = MFA_STATE.currentUser;
    window.location.href = `/dashboard.html?user=${encodeURIComponent(user.username)}&email=${encodeURIComponent(user.email)}`;
  } else {
    // No hay sesión, mostrar login
    showLogin();
  }
  
  // Modal de inicio rápido
  const quickStart = document.getElementById('quickStart');
  if (quickStart) {
    quickStart.onclick = (e) => {
      e.preventDefault();
      new bootstrap.Modal(document.getElementById('checklistModal')).show();
    };
  }
  
  // Botón de demo
  const startDemoBtn = document.getElementById('startDemoBtn');
  if (startDemoBtn) {
    startDemoBtn.onclick = () => {
      const modalEl = document.getElementById('checklistModal');
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
      document.body.classList.add('demo-started');
      setTimeout(() => document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' }), 100);
      showRegister();
    };
  }
});

// Exportar funciones globales necesarias
window.showRegister = showRegister;
window.showLogin = showLogin;
window.logout = logout;
