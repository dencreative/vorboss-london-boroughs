class UKPostcodeValidator {
  constructor(options = {}) {
    this.postcodes = options.postcodes || this.getDefaultPostcodes();
    
    // Auto-detect the script path and construct JSON URL
    let defaultDataUrl = './uk-postcodes-full.json';
    try {
      const scriptSrc = document.currentScript?.src || 
                       Array.from(document.scripts).find(s => s.src.includes('uk-postcode-validator'))?.src;
      if (scriptSrc) {
        const basePath = scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1);
        defaultDataUrl = basePath + 'uk-postcodes-full.json';
      }
    } catch (e) {
      console.warn('Could not auto-detect script path, using relative path');
    }
    
    this.options = {
      dataUrl: options.dataUrl || defaultDataUrl,
      minChars: options.minChars || 2,
      debounceTime: options.debounceTime || 300,
      errorMessage: options.errorMessage || 'Sorry, we don\'t service this area yet. Please call +44 (0) 20 3773 0000 to discuss your requirements.',
      maxResults: options.maxResults || 5,
      ...options
    };
    
    this.debounceTimer = null;
    this.currentInput = null;
    this.dropdown = null;
    this.errorElement = null;
    
    this.init();
  }
  
  getDefaultPostcodes() {
    // Fallback postcodes for when the full dataset fails to load
    return [
      "SW1A1AA", "SW1A1AB", "SW1A2AA", "W1A0AX", "W1A1AA",
      "M11AA", "M11AB", "M60AA", "B11AA", "B11AB",
      "LS11AA", "LS11AB", "E11AA", "E11AB", "E201AA",
      "SE11AA", "N11AA", "NW11AA", "EC1A1AA", "WC1A1AA",
      "BR11AA", "BR11AB", "CR01AA", "TW11AA", "KT11AA",
      "SM11AA", "IG11AA", "RM11AA", "DA11AA", "UB11AA"
    ];
  }
  
  async init() {
    if (this.options.dataUrl) {
      await this.loadPostcodes();
    }
    this.setupFormIntegration();
  }
  
  async loadPostcodes() {
    try {
      const response = await fetch(this.options.dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        this.postcodes = data;
      }
    } catch (error) {
      console.warn('Failed to load postcodes from URL, using fallback data:', error);
    }
  }
  
  setupFormIntegration() {
    const postcodeInputs = document.querySelectorAll('input[name="business_postcode"], input[name*="postcode"], input[name*="postal"], input[id*="postcode"], input[id*="postal"]');
    
    if (postcodeInputs.length === 0) {
      console.warn('No postcode inputs found. Looking for common field patterns...');
      return;
    }
    
    postcodeInputs.forEach(input => {
      if (!input.dataset.ukPostcodeAttached) {
        this.attachToInput(input);
        input.dataset.ukPostcodeAttached = 'true';
      }
    });
  }
  
  attachToInput(input) {
    this.setupUI(input);
    
    input.addEventListener('input', (e) => this.handleInput(e));
    input.addEventListener('keydown', (e) => this.handleKeydown(e));
    input.addEventListener('blur', (e) => this.handleBlur(e));
    input.addEventListener('focus', () => this.hideError());
  }
  
  setupUI(input) {
    const container = document.createElement('div');
    container.className = 'uk-postcode-container';
    container.style.position = 'relative';
    
    input.parentNode.insertBefore(container, input);
    container.appendChild(input);
    
    const dropdown = document.createElement('div');
    dropdown.className = 'uk-postcode-dropdown';
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #cbd6e2;
      border-top: none;
      border-radius: 0 0 3px 3px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    const errorElement = document.createElement('div');
    errorElement.className = 'uk-postcode-error';
    errorElement.style.cssText = `
      color: #ff6600;
      font-size: 14px;
      margin-top: 4px;
      display: none;
    `;
    
    container.appendChild(dropdown);
    container.appendChild(errorElement);
    
    input.ukPostcodeDropdown = dropdown;
    input.ukPostcodeError = errorElement;
  }
  
  handleInput(e) {
    const input = e.target;
    const query = input.value.trim();
    
    clearTimeout(this.debounceTimer);
    
    if (query.length < this.options.minChars) {
      this.hideError(input);
      return;
    }
    
    // Validate the input after debounce delay
    this.debounceTimer = setTimeout(() => {
      this.validateCurrentInput(input);
    }, this.options.debounceTime);
  }
  
  handleKeydown(e) {
    // Dropdown functionality disabled - no keyboard navigation
    return;
  }
  
  handleBlur(e) {
    const input = e.target;
    
    setTimeout(() => {
      this.validateCurrentInput(input);
      this.hideDropdown(input);
    }, 150);
  }
  
  setActiveItem(items, activeIndex) {
    // Dropdown functionality disabled
    return;
  }
  
  searchPostcodes(query) {
    const normalized = this.normalizePostcode(query);
    return this.postcodes
      .filter(postcode => postcode.startsWith(normalized))
      .slice(0, this.options.maxResults);
  }
  
  normalizePostcode(postcode) {
    return postcode.replace(/\s+/g, '').toUpperCase();
  }
  
  formatPostcode(postcode) {
    const normalized = this.normalizePostcode(postcode);
    if (normalized.length >= 5) {
      return normalized.slice(0, -3) + ' ' + normalized.slice(-3);
    }
    return normalized;
  }
  
  showDropdown(input, matches) {
    // Dropdown functionality disabled
    return;
  }
  
  hideDropdown(input) {
    if (input && input.ukPostcodeDropdown) {
      input.ukPostcodeDropdown.style.display = 'none';
    }
  }
  
  selectPostcode(input, postcode) {
    // Dropdown functionality disabled - this method is no longer used
    return;
  }
  
  validateCurrentInput(input) {
    const value = input.value.trim();
    if (!value) {
      this.hideError(input);
      return true;
    }
    
    const normalized = this.normalizePostcode(value);
    const isValid = this.postcodes.includes(normalized);
    
    if (isValid) {
      input.value = this.formatPostcode(value);
      input.dataset.ukPostcodeValid = 'true';
      this.hideError(input);
      return true;
    } else {
      input.dataset.ukPostcodeValid = 'false';
      this.showError(input);
      return false;
    }
  }
  
  validateForm(form) {
    const postcodeInputs = form.querySelectorAll('input[data-uk-postcode-attached="true"]');
    let isValid = true;
    
    postcodeInputs.forEach(input => {
      if (!this.validateCurrentInput(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  showError(input) {
    const errorElement = input.ukPostcodeError;
    if (errorElement) {
      errorElement.textContent = this.options.errorMessage;
      errorElement.style.display = 'block';
    }
  }
  
  hideError(input) {
    const errorElement = input ? input.ukPostcodeError : null;
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }
}

if (typeof window !== 'undefined') {
  window.UKPostcodeValidator = UKPostcodeValidator;
  
  document.addEventListener('DOMContentLoaded', () => {
    if (window.ukPostcodeValidatorAutoInit !== false) {
      new UKPostcodeValidator();
    }
  });
}