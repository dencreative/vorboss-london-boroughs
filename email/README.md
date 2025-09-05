# Email Domain Validator

A JavaScript library that prevents users from submitting forms with personal email addresses (like Gmail, Yahoo, etc.) and integrates seamlessly with HubSpot forms.

## Features

- **Automatic Detection**: Finds email inputs using multiple selectors including `name="email"`, `type="email"`, and placeholder text
- **Dynamic Form Support**: Uses MutationObserver to detect dynamically loaded forms (like HubSpot)
- **Comprehensive Blocking**: Blocks 40+ common personal email domains by default
- **Real-time Validation**: Shows error messages as users type (with debouncing)
- **HubSpot Integration**: Prevents form submission and integrates with HubSpot's form callbacks
- **Customizable**: Easy to add/remove blocked domains and customize error messages

## Quick Start

### 1. Include the Script

```html
<script src="./email-domain-validator.min.js"></script>
```

### 2. Basic Usage (Auto-initialization)

The validator automatically initializes when the DOM loads and finds email inputs with these patterns:
- `input[type="email"]`
- `input[name="email"]` ← **This matches your HubSpot field**
- `input[name*="email"]`
- `input[id*="email"]`
- `input[placeholder*="email"]`

### 3. Your HubSpot Field

Your field structure:
```html
<div class="input">
    <input id="email-a1ee14ef-6421-4b93-af3f-a6b561bbc26b" 
           name="email" 
           required="" 
           placeholder="Company email*" 
           type="email" 
           class="hs-input invalid error" 
           inputmode="email" 
           autocomplete="email" 
           value="">
</div>
```

**✅ This will be automatically detected** by the `input[name="email"]` and `input[type="email"]` selectors.

## Blocked Domains (Default)

The validator blocks these personal email providers by default:

### Major Providers
- **Gmail**: gmail.com, googlemail.com
- **Yahoo**: yahoo.com, yahoo.co.uk, yahoo.ca, yahoo.com.au, yahoo.de, yahoo.fr, ymail.com, rocketmail.com
- **Microsoft**: hotmail.com, hotmail.co.uk, hotmail.fr, hotmail.de, hotmail.it, outlook.com, outlook.co.uk, live.com, live.co.uk, msn.com
- **Apple**: icloud.com, me.com, mac.com
- **AOL**: aol.com, aol.co.uk

### Other Popular Services
- ProtonMail, Tutanota, Zoho, Mail.com, GMX, Web.de, Yandex, Mail.ru, QQ, 163.com, Naver, Fastmail, and more

### Temporary Email Services
- 10minutemail.com, mailinator.com, tempmail.org, guerrillamail.com

## Custom Configuration

```javascript
// Custom initialization with options
window.emailDomainValidatorInstance = new EmailDomainValidator({
    errorMessage: 'Business email addresses only. Personal email providers are not accepted.',
    debounceTime: 500, // Wait 500ms after user stops typing
    blockedDomains: [
        // Add custom domains (merges with defaults)
        'custom-blocked-domain.com'
    ]
});

// Add domains dynamically
window.emailDomainValidatorInstance.addBlockedDomain('another-domain.com');

// Remove domains
window.emailDomainValidatorInstance.removeBlockedDomain('gmail.com');

// Get current blocked domains
console.log(window.emailDomainValidatorInstance.getBlockedDomains());
```

## HubSpot Integration

The validator integrates with HubSpot forms in multiple ways:

### 1. Form Submission Prevention
```javascript
// Listens for HubSpot form callbacks
window.addEventListener('message', function(event) {
    if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onBeforeFormSubmit') {
        // Validates email domains before submission
        const isValid = window.emailDomainValidatorInstance.validateForm(form);
        if (!isValid) {
            throw new Error('Email domain validation failed'); // Prevents submission
        }
    }
});
```

### 2. Dynamic Form Detection
```javascript
// Re-scans for email inputs when HubSpot forms load
if (event.data.eventName === 'onFormReady') {
    window.emailDomainValidatorInstance.setupFormIntegration();
}
```

### 3. Standard Form Prevention
```javascript
// Also prevents standard form submissions
document.addEventListener('submit', function(event) {
    const isValid = window.emailDomainValidatorInstance.validateForm(event.target);
    if (!isValid) {
        event.preventDefault();
        return false;
    }
});
```

## Error Messages

When a blocked domain is detected, users see:
```
@gmail.com is not accepted. Personal email addresses are not accepted. Please use your business email address.
```

The error appears below the input field in orange text (#ff6600) and disappears when:
- User focuses on the field
- User enters a valid business email
- User clears the field

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills for MutationObserver if needed)

## Files

- `email-domain-validator.js` - Full source code with comments
- `email-domain-validator.min.js` - Minified production version
- `production-script.html` - Complete example with HubSpot integration
- `README.md` - This documentation

## Testing

Test the validator with these example emails:
- `user@gmail.com` → **BLOCKED**
- `user@company.com` → **ALLOWED**
- `test@yahoo.com` → **BLOCKED**
- `business@vorboss.com` → **ALLOWED**

## Troubleshooting

### Email Input Not Found
If the validator doesn't attach to your email field:

1. **Check the console** for "No email inputs found" warning
2. **Verify selectors** - the field should match one of these:
   - `input[type="email"]`
   - `input[name="email"]`
   - `input[name*="email"]`
   - `input[placeholder*="email"]`
3. **Check timing** - if the form loads dynamically, the MutationObserver should catch it
4. **Manual attachment**:
   ```javascript
   const emailInput = document.querySelector('#your-email-field');
   window.emailDomainValidatorInstance.attachToInput(emailInput);
   ```

### Form Still Submits
If forms submit despite blocked emails:

1. **Check validation** - call `validateForm()` manually to test
2. **Verify integration** - ensure HubSpot callbacks are working
3. **Check console** for error messages
4. **Test with standard forms** first, then HubSpot-specific features

### Custom Error Styling
Override the default error styling:
```css
.email-domain-error {
    color: #your-color !important;
    font-size: your-size !important;
    /* Add your custom styles */
}
```
