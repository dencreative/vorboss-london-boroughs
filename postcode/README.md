# UK Postcode Validator

A JavaScript library that provides real-time postcode validation and autocomplete functionality for UK postcodes, specifically designed for HubSpot forms and other web forms.

## Features

- **Real-time validation** - Validates UK postcodes as users type
- **Autocomplete dropdown** - Shows matching postcodes with keyboard navigation support
- **HubSpot integration** - Automatically detects and attaches to HubSpot form fields
- **Flexible targeting** - Works with various postcode input field naming patterns
- **Custom error messages** - Displays helpful error messages for invalid postcodes
- **Fallback data** - Includes built-in postcode data as backup
- **Dynamic data loading** - Loads comprehensive postcode data from JSON file
- **Auto-path detection** - Automatically resolves paths to data files based on script location

## Files

- `uk-postcode-validator.js` - Full source code with comments
- `uk-postcode-validator.min.js` - Minified production version
- `uk-postcodes-full.json` - Comprehensive UK postcode dataset

## Usage

### Basic Implementation

```html
<script src="uk-postcode-validator.min.js"></script>
<script>
// The validator automatically initializes on DOM ready
// It will find and attach to postcode input fields
</script>
```

### Custom Configuration

```javascript
const validator = new UKPostcodeValidator({
  errorMessage: 'Custom error message here',
  minChars: 2,                    // Minimum characters before search
  debounceTime: 300,              // Delay in milliseconds
  maxResults: 8,                  // Maximum dropdown results
  dataUrl: 'custom-data.json'     // Custom data source
});
```

### HubSpot Integration

The validator automatically detects HubSpot forms and specifically targets:
- Fields with name `business_postcode`
- Fields with names containing `postcode` or `postal`
- Fields with IDs containing `postcode` or `postal`

```javascript
// For HubSpot forms, initialize after form is ready
hbspt.forms.create({
  // ... form config
  onFormReady: function() {
    new UKPostcodeValidator({
      errorMessage: 'Sorry, we don\'t service this area yet. Please call +44 (0) 20 3773 0000 to discuss your requirements.'
    });
  }
});
```

## Form Validation

The validator adds a `data-uk-postcode-valid` attribute to validated inputs:
- `"true"` - Valid postcode
- `"false"` - Invalid postcode

You can check form validity using:

```javascript
const isValid = validator.validateForm(document.querySelector('form'));
```

## Keyboard Navigation

The dropdown supports full keyboard navigation:
- **Arrow Up/Down** - Navigate through suggestions
- **Enter** - Select highlighted suggestion
- **Escape** - Close dropdown

## Error Handling

- Invalid postcodes show custom error messages
- Failed data loading falls back to built-in postcode list
- Network errors are handled gracefully with console warnings

## Browser Compatibility

- Modern browsers with ES6+ support
- Uses `fetch()` API for data loading
- Supports `async/await` syntax

## CDN Cache Management

When using CDN services like jsDelivr, you can purge the cache to ensure updates are reflected:

```bash
curl "https://purge.jsdelivr.net/gh/your-username/your-repo/postcode/uk-postcode-validator.min.js"
```

## Technical Details

### Data Format
The validator expects postcode data as a JSON array of normalized postcodes (uppercase, no spaces):
```json
["SW1A1AA", "SW1A1AB", "M11AA", ...]
```

### Path Resolution
The script automatically detects its own location and loads the JSON data file from the same directory, making it portable across different hosting environments.

### Styling
The validator creates its own UI elements with inline styles for portability. Custom CSS classes are available for styling:
- `.uk-postcode-container` - Main container
- `.uk-postcode-dropdown` - Dropdown container
- `.uk-postcode-item` - Individual dropdown items
- `.uk-postcode-error` - Error message container