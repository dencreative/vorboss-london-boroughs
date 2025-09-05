class EmailDomainValidator {
  constructor(options = {}) {
    this.blockedDomains = options.blockedDomains || this.getDefaultBlockedDomains();
    
    this.options = {
      errorMessage: options.errorMessage || 'Personal email addresses are not accepted. Please use your business email address.',
      debounceTime: options.debounceTime || 300,
      ...options
    };
    
    this.debounceTimer = null;
    this.currentInput = null;
    this.errorElement = null;
    
    this.init();
  }
  
  getDefaultBlockedDomains() {
    // Common public email domains that should be blocked
    return [
      // Gmail
      'gmail.com', 'googlemail.com',
      
      // Yahoo
      'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.com.au', 'yahoo.de', 'yahoo.fr',
      'ymail.com', 'rocketmail.com',
      
      // Microsoft
      'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it',
      'outlook.com', 'outlook.co.uk', 'live.com', 'live.co.uk', 'msn.com',
      
      // Apple
      'icloud.com', 'me.com', 'mac.com',
      
      // AOL
      'aol.com', 'aol.co.uk',
      
      // Other popular free email providers
      'protonmail.com', 'proton.me',
      'tutanota.com', 'tutanota.de',
      'zoho.com', 'zohomail.com',
      'mail.com',
      'gmx.com', 'gmx.de', 'gmx.net',
      'web.de',
      't-online.de',
      'freenet.de',
      'yandex.com', 'yandex.ru',
      'mail.ru',
      'rambler.ru',
      'qq.com',
      '163.com',
      '126.com',
      'sina.com',
      'naver.com',
      'daum.net',
      'rediffmail.com',
      'fastmail.com',
      'hushmail.com',
      'guerrillamail.com',
      '10minutemail.com',
      'mailinator.com',
      'tempmail.org',
      'guerrillamailblock.com'
    ];
  }
  
  async init() {
    this.setupFormIntegration();
  }
  
  setupFormIntegration() {
    // Look for email inputs with common patterns, including HubSpot forms
    const emailInputs = document.querySelectorAll('input[type="email"], input[name="email"], input[name*="email"], input[id*="email"], input[name*="Email"], input[id*="Email"], input[placeholder*="email" i], input[placeholder*="Email"]');
    
    if (emailInputs.length === 0) {
      console.warn('No email inputs found. Looking for common field patterns...');
      // Try to observe for dynamically added forms (like HubSpot)
      this.observeForEmailInputs();
      return;
    }
    
    emailInputs.forEach(input => {
      if (!input.dataset.emailDomainAttached) {
        this.attachToInput(input);
        input.dataset.emailDomainAttached = 'true';
      }
    });
  }
  
  observeForEmailInputs() {
    // Create a MutationObserver to watch for dynamically added email inputs
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is an email input or contains email inputs
            let emailInputs = [];
            
            if (node.matches && node.matches('input[type="email"], input[name="email"], input[name*="email"], input[id*="email"], input[placeholder*="email" i]')) {
              emailInputs.push(node);
            }
            
            if (node.querySelectorAll) {
              const foundInputs = node.querySelectorAll('input[type="email"], input[name="email"], input[name*="email"], input[id*="email"], input[placeholder*="email" i]');
              emailInputs.push(...foundInputs);
            }
            
            emailInputs.forEach(input => {
              if (!input.dataset.emailDomainAttached) {
                this.attachToInput(input);
                input.dataset.emailDomainAttached = 'true';
              }
            });
          }
        });
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Store observer for potential cleanup
    this.observer = observer;
  }
  
  attachToInput(input) {
    this.setupUI(input);
    
    input.addEventListener('input', (e) => this.handleInput(e));
    input.addEventListener('blur', (e) => this.handleBlur(e));
    input.addEventListener('focus', () => this.hideError(input));
  }
  
  setupUI(input) {
    const container = document.createElement('div');
    container.className = 'email-domain-container';
    container.style.position = 'relative';
    
    input.parentNode.insertBefore(container, input);
    container.appendChild(input);
    
    const errorElement = document.createElement('div');
    errorElement.className = 'email-domain-error';
    errorElement.style.cssText = `
      color: #ff6600;
      font-size: 14px;
      margin-top: 4px;
      display: none;
    `;
    
    container.appendChild(errorElement);
    input.emailDomainError = errorElement;
  }
  
  handleInput(e) {
    const input = e.target;
    
    clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(() => {
      this.validateCurrentInput(input);
    }, this.options.debounceTime);
  }
  
  handleBlur(e) {
    const input = e.target;
    
    setTimeout(() => {
      this.validateCurrentInput(input);
    }, 150);
  }
  
  extractDomain(email) {
    const emailPattern = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/;
    const match = email.match(emailPattern);
    return match ? match[1].toLowerCase() : null;
  }
  
  isDomainBlocked(domain) {
    return this.blockedDomains.includes(domain.toLowerCase());
  }
  
  validateCurrentInput(input) {
    const value = input.value.trim();
    if (!value) {
      this.hideError(input);
      input.dataset.emailDomainValid = 'true';
      return true;
    }
    
    const domain = this.extractDomain(value);
    if (!domain) {
      // Invalid email format, but we'll let the browser's built-in validation handle that
      this.hideError(input);
      input.dataset.emailDomainValid = 'true';
      return true;
    }
    
    if (this.isDomainBlocked(domain)) {
      input.dataset.emailDomainValid = 'false';
      this.showError(input, domain);
      return false;
    } else {
      input.dataset.emailDomainValid = 'true';
      this.hideError(input);
      return true;
    }
  }
  
  validateForm(form) {
    const emailInputs = form.querySelectorAll('input[data-email-domain-attached="true"]');
    let isValid = true;
    
    emailInputs.forEach(input => {
      if (!this.validateCurrentInput(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  showError(input, domain) {
    const errorElement = input.emailDomainError;
    if (errorElement) {
      const customMessage = `@${domain} is not accepted. ${this.options.errorMessage}`;
      errorElement.textContent = customMessage;
      errorElement.style.display = 'block';
    }
  }
  
  hideError(input) {
    const errorElement = input ? input.emailDomainError : null;
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }
  
  // Method to add custom blocked domains
  addBlockedDomain(domain) {
    if (!this.blockedDomains.includes(domain.toLowerCase())) {
      this.blockedDomains.push(domain.toLowerCase());
    }
  }
  
  // Method to remove blocked domains
  removeBlockedDomain(domain) {
    const index = this.blockedDomains.indexOf(domain.toLowerCase());
    if (index > -1) {
      this.blockedDomains.splice(index, 1);
    }
  }
  
  // Method to get current blocked domains
  getBlockedDomains() {
    return [...this.blockedDomains];
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.EmailDomainValidator = EmailDomainValidator;
}
