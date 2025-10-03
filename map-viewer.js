// MapTiler API Key and Constants
const MAPTILER_API_KEY = "qViRNrVhwZEkj1UW0AeD";

const CONSTANTS = {
    COLORS: {
        BASE: "rgba(216, 180, 254, 0.6)",
        HOVER: "rgba(147, 51, 234, 0.8)",
        BORDER: "#FFFFFF"
    },
    TIMING: {
        ZOOM_DURATION: 1000,
        POPUP_DELAY: 200,
        DEBOUNCE_SEARCH: 300,
        TOUCH_FEEDBACK_DURATION: 800,
        SIDEBAR_ANIMATION_DELAY: 500
    },
    ZOOM: {
        MIN: 8,
        MAX: 20,
        DESKTOP_INITIAL: 11.963,
        MOBILE_INITIAL: 9.3,  // Further reduced for 380px viewport
        MOBILE_BASE: 9.6,     // Further reduced for 380px viewport
        MOBILE_BOROUGH_MAX: 11.8, // Further reduced for 380px viewport
        DESKTOP_BOROUGH_MAX: 14,
        FALLBACK: 12.75
    },
    BREAKPOINTS: {
        MOBILE: 1024,
        TABLET: 768,
        SMALL_MOBILE: 480
    },
    SEARCH: {
        MIN_CHARS: 3,
        AUTOCOMPLETE_LIMIT: 10,
        CLEAR_THRESHOLD: 0
    },
    MAP: {
        LONDON_CENTER: [-0.118595, 51.507565],
        FALLBACK_CENTER: [-0.0912, 51.5068],
        BOROUGH_CENTROID_FALLBACK: [-0.1252677436366938, 51.50919357899921]
    },
    VIEWPORT: {
        MOBILE_MAX_HEIGHT: 380  // Mobile viewport height limit
    },
    PADDING: {
        DESKTOP_DEFAULT: 50,
        DESKTOP_BOROUGH: { top: 80, bottom: 80, left: 80, right: 350 },
        MOBILE_BOROUGH: { top: 25, bottom: 25, left: 12, right: 12 }, // Further reduced for 380px viewport
        MOBILE_BASE: { top: 15, bottom: 25, left: 15, right: 15 }     // Further reduced for 380px viewport
    },
    MAPTILER_STYLES: [
        { name: "Basic", url: `https://api.maptiler.com/maps/basic-v2/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Streets", url: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Backdrop", url: `https://api.maptiler.com/maps/backdrop/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Bright", url: `https://api.maptiler.com/maps/bright-v2/style.json?key=${MAPTILER_API_KEY}` },
        { name: "DataViz", url: `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Toner", url: `https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Satellite", url: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Hybrid", url: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Outdoor", url: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Winter", url: `https://api.maptiler.com/maps/winter-v2/style.json?key=${MAPTILER_API_KEY}` },
        { name: "OpenStreetMap", url: `https://api.maptiler.com/maps/openstreetmap/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Topo", url: `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_API_KEY}` },
        { name: "Ocean", url: `https://api.maptiler.com/maps/ocean/style.json?key=${MAPTILER_API_KEY}` },
        { name: "C1", url: "custom-dataviz", isCustom: true, baseStyle: "dataviz", textStyle: "basic" },
        { name: "C2", url: "custom-backdrop", isCustom: true, baseStyle: "backdrop", textStyle: "basic" }
    ]
};

// Main MapLibre Borough Map Class
class MapLibreBoroughMap {
    constructor(mapContainerId) {
        if (!mapContainerId) {
            throw new Error("Map container ID is required");
        }

        this.isMobile = window.innerWidth <= CONSTANTS.BREAKPOINTS.MOBILE;

        // Initialize debugging early, but only set up a basic logger
        this.initialViewportState = {
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            isMobile: this.isMobile,
            breakpoint: this.isMobile ? 'MOBILE' : 'DESKTOP',
            timestamp: new Date().toISOString()
        };

        console.group('🚀 [VIEWPORT DEBUG] CONSTRUCTOR');
        console.log('📱 Initial Viewport State:', this.initialViewportState);
        console.groupEnd();

        this.initializeElements();
        this.setupEventListeners();
        this.initializeState();
        this.initializeData();
        this.initializeMap(mapContainerId);
        this.init();
        this.setupResponsiveHandlers();
    }

    initializeElements() {
        this.ui = {
            sidebar: document.getElementById("sidebar"),
            boroughInfo: document.getElementById("borough-info"),
            resetViewBtn: document.getElementById("reset-view"),
            searchContainer: document.getElementById("search-container"),
            postcodeSearch: document.getElementById("postcode-search"),
            searchSpinner: document.getElementById("search-spinner"),
            searchClearBtn: document.getElementById("search-clear"),
            autocompleteDropdown: document.getElementById("autocomplete-dropdown"),
            searchError: document.getElementById("search-error"),
            isValid: true
        };

        // Validate all required elements exist
        for (const [key, element] of Object.entries(this.ui)) {
            if (key === "isValid") continue;
            if (!element) {
                console.error(`[MapViewer] Missing required DOM element: ${key}`);
                this.ui.isValid = false;
            }
        }

        // Hide sidebar initially
        if (this.ui.sidebar) {
            this.ui.sidebar.classList.add("hidden");
        }
    }

    setupEventListeners() {
        // Reset view button
        if (this.ui.resetViewBtn) {
            this.ui.resetViewBtn.addEventListener("click", () => this.resetView());
        }

        if (this.ui.searchContainer) {
            // Search container click handling for zoomed state
            this.ui.searchContainer.addEventListener("click", (event) => {
                if (this.state.isZoomedIn) {
                    event.preventDefault();
                    this.resetView();
                }
            });

            // Prevent event bubbling when not zoomed in
            this.ui.postcodeSearch.addEventListener("click", (event) => {
                if (!this.state.isZoomedIn) {
                    event.stopPropagation();
                }
            });

            // Debounced search handling
            const debouncedSearch = this.debounce(this.handlePostcodeSearch.bind(this), CONSTANTS.TIMING.DEBOUNCE_SEARCH);
            this.ui.postcodeSearch.addEventListener("keyup", (event) => {
                if (event.key === "Escape") {
                    this.clearSearch();
                } else if (event.key !== "Enter") {
                    debouncedSearch(event.target.value);
                }
            });

            // Handle Enter key for autocomplete
            this.ui.postcodeSearch.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    const suggestions = this.ui.autocompleteDropdown.querySelectorAll(".autocomplete-item");
                    if (suggestions.length === 1) {
                        suggestions[0].click();
                    }
                }
            });

            // Clear search button
            this.ui.searchClearBtn.addEventListener("click", this.clearSearch.bind(this));
        }
    }

    initializeState() {
        this.state = {
            isZoomedIn: false,
            selectedBoroughKey: null,
            currentHoveredFeature: null,
            currentHoveredBoroughKey: null,
            currentSelectedFeature: null,
            currentSelectedBoroughKey: null,
            selectedBorough: null,
            interactionsEnabled: true,
            searchQuery: "",
            searchResults: [],
            searchAbortController: null,
            zoomControl: null,
            optimalZoom: null,
            hoverPopup: null,
            storedPopupPosition: null,
            currentStyleIndex: 4 // Default to DataViz style
        };
    }

    initializeData() {
        this.boroughData = {};
        this.loadBoroughInfoFromHTML();
        this.supportedBoroughs = new Set(Object.keys(this.boroughData));
    }

    initializeMap(mapContainerId) {
        const initialZoom = this.isMobile ? CONSTANTS.ZOOM.MOBILE_INITIAL : CONSTANTS.ZOOM.DESKTOP_INITIAL;

        this.logViewportDebugInfo('MAP_INITIALIZATION', {
            container: mapContainerId,
            initialZoom: initialZoom,
            center: CONSTANTS.MAP.LONDON_CENTER,
            minZoom: CONSTANTS.ZOOM.MIN,
            maxZoom: CONSTANTS.ZOOM.MAX,
            interactions: {
                doubleClickZoom: !this.isMobile,
                scrollZoom: false,              // Disabled entirely
                touchZoomRotate: this.isMobile,
                cooperativeGestures: this.isMobile // Enable on mobile to prevent scroll hijacking
            }
        });

        this.map = new maplibregl.Map({
            container: mapContainerId,
            center: CONSTANTS.MAP.LONDON_CENTER, // London center
            zoom: initialZoom, // More zoomed out on mobile
            style: `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}`,
            interactive: true,
            attributionControl: false,
            minZoom: CONSTANTS.ZOOM.MIN,
            maxZoom: CONSTANTS.ZOOM.MAX,
            boxZoom: false,
            doubleClickZoom: !this.isMobile, // Disabled on mobile
            dragPan: true,                   // Enable drag pan
            dragRotate: false,
            keyboard: false,
            scrollZoom: false,               // Disabled to prevent page scroll conflicts on mobile
            touchZoomRotate: this.isMobile,  // Enable pinch zoom on mobile
            cooperativeGestures: this.isMobile // Enable on mobile to prevent scroll hijacking
        });

        // Enhanced debug: Log zoom changes with viewport context
        this.map.on('zoom', () => {
            const currentZoom = this.map.getZoom().toFixed(2);
            this.logViewportDebugInfo('ZOOM_CHANGE', {
                newZoom: currentZoom,
                source: 'zoom_event'
            });
            if (currentZoom === '11.00') {
                console.trace('[MapViewer] Zoom set to 11.00 - stack trace:');
            }
        });

        // Log viewport changes on move events
        this.map.on('moveend', () => {
            this.logViewportDebugInfo('MOVE_END', {
                source: 'moveend_event'
            });
        });

        // Disable debug features
        this.map.showTileBoundaries = false;
        this.map.showCollisionBoxes = false;
        this.map.showPadding = false;

        this.map.on("load", () => {
            this.logViewportDebugInfo('MAP_LOADED', {
                source: 'load_event',
                timeSinceConstruction: Date.now() - new Date(this.initialViewportState.timestamp).getTime()
            });
            this.addPopupStyles();
            this.createStyleSwitcher();
        });

        this.map.on("error", (error) => {
            console.error("[MapViewer] Map error:", error);
        });
    }

    loadBoroughInfoFromHTML() {
        const collectionWrapper = document.querySelector(".collection-list-wrapper-2.w-dyn-list");
        if (!collectionWrapper) return;

        const boroughItems = collectionWrapper.querySelectorAll(".w-dyn-item");
        boroughItems.forEach(item => {
            const boroughId = item.getAttribute("data-borough-id");
            if (!boroughId) return;

            // Convert borough ID to key format
            let boroughKey = boroughId.replace("borough-", "").replace(/-/g, "_");
            const boroughName = this.formatBoroughName(boroughKey);

            // Extract image
            const imageElement = item.querySelector("[data-borough-image]");
            let imageSrc = "";
            if (imageElement) {
                imageSrc = imageElement.src;
            }

            // Extract links
            const linkContainer = item.querySelector("[data-link-container]");
            const links = [];
            if (linkContainer) {
                const linkElements = linkContainer.querySelectorAll("a:not(.w-dyn-bind-empty)");
                linkElements.forEach(link => {
                    links.push({
                        href: link.href,
                        text: link.textContent.trim()
                    });
                });
            }

            // Extract coverage data
            const coverageElement = item.querySelector("[data-coverage]");
            const coverage = coverageElement ? coverageElement.getAttribute("data-coverage") : "full";

            // Extract rich text content
            const richTextElement = item.querySelector("[data-rich-text]");
            const richText = richTextElement ? richTextElement.innerHTML : "";

            if (boroughKey) {
                this.boroughData[boroughKey] = {
                    name: boroughName,
                    image: imageSrc,
                    links: links,
                    coverage: coverage,
                    richText: richText
                };
            }
        });
    }

    async init() {
        let dataLoaded = false;

        // Primary load handler
        this.map.on("load", async () => {
            if (dataLoaded) return;
            dataLoaded = true;
            await this.loadBoroughAndFinish();
        });

        // Fallback: Use styledata event if load doesn't fire
        let styleLoadCount = 0;
        this.map.on("styledata", async () => {
            styleLoadCount++;

            // After 2-3 styledata events, the map is usually ready
            if (styleLoadCount >= 2 && !dataLoaded) {
                dataLoaded = true;
                setTimeout(async () => {
                    await this.loadBoroughAndFinish();
                }, 1000);
            }
        });

        // Emergency fallback after 5 seconds
        setTimeout(async () => {
            if (!dataLoaded) {
                dataLoaded = true;
                await this.loadBoroughAndFinish();
            }
        }, 5000);
    }

    async loadBoroughAndFinish() {
        try {
            await this.loadBoroughData();

            // Hide loading overlay
            const loadingOverlay = document.getElementById("loading-overlay");
            if (loadingOverlay) {
                loadingOverlay.style.display = "none";
            }
        } catch (error) {
            console.error("[MapViewer] Failed to complete initialization:", error);
        }
    }

    async loadBoroughData() {
        try {
            // Dynamic path resolution for JSON data
            const scriptSrc = document.currentScript?.src ||
                Array.from(document.scripts).find(script => script.src.includes("map-viewer"))?.src ||
                "./js/map-viewer.js";
            const basePath = scriptSrc.substring(0, scriptSrc.lastIndexOf("/") + 1);
            const dataUrl = basePath + "all_coverage_new.json";

            const response = await fetch(dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const geoJsonData = await response.json();
            this.originalGeoJSONData = geoJsonData;

            // Calculate bounds and center
            const bbox = turf.bbox(geoJsonData);
            const centroid = turf.centroid(geoJsonData).geometry.coordinates;
            this.turfBoroughsBbox = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
            this.turfBoroughsCentroid = centroid;

            // Fit map to borough bounds - use different behavior for mobile vs desktop
            if (this.isMobile) {
                console.log(`[MapViewer] Mobile: Using fitBounds with mobile padding for proper centering`);
                // Delay mobile fitBounds to ensure it happens after everything else
                setTimeout(() => {
                    console.log(`[MapViewer] Mobile: Setting fitBounds with mobile padding`);
                    this.map.fitBounds(this.turfBoroughsBbox, {
                        padding: CONSTANTS.PADDING.MOBILE_BASE,
                        maxZoom: CONSTANTS.ZOOM.MOBILE_BASE,
                        duration: 300 // Small animation to override any other zoom
                    });
                }, 100);

                console.log(`[MapViewer] Mobile: fitBounds scheduled`);
            } else {
                console.log(`[MapViewer] Desktop: Using fitBounds with bbox:`, this.turfBoroughsBbox);
                this.map.fitBounds(this.turfBoroughsBbox, { padding: CONSTANTS.PADDING.DESKTOP_DEFAULT });
            }

            // Process borough features
            const loadedBoroughs = new Set();
            geoJsonData.features.forEach(feature => {
                const boroughKey = feature.properties.NAME.toLowerCase().replace(/[& ]/g, "_");
                feature.properties.borough_key = boroughKey;
                loadedBoroughs.add(boroughKey);
            });

            // Validate all features have borough keys
            const featuresWithoutKeys = geoJsonData.features.filter(feature => !feature.properties?.borough_key);
            if (featuresWithoutKeys.length > 0) {
                throw new Error(`Borough key assignment failed for ${featuresWithoutKeys.length} features`);
            }

            // Clean up borough data for unloaded boroughs
            const unloadedBoroughs = Object.keys(this.boroughData).filter(key => !loadedBoroughs.has(key));
            if (unloadedBoroughs.length > 0) {
                unloadedBoroughs.forEach(key => {
                    delete this.boroughData[key];
                });
            }

            // Remove existing layers and sources
            if (this.map.getLayer("borough-labels")) this.map.removeLayer("borough-labels");
            if (this.map.getLayer("borough-fills")) this.map.removeLayer("borough-fills");
            if (this.map.getLayer("boroughs")) this.map.removeLayer("boroughs");
            if (this.map.getLayer("borough-borders")) this.map.removeLayer("borough-borders");
            if (this.map.getSource("boroughs")) this.map.removeSource("boroughs");

            // Add new source and layers
            this.map.addSource("boroughs", {
                type: "geojson",
                data: geoJsonData,
                promoteId: "borough_key"
            });

            this.addBoroughLayers();
            this.generateBoroughCards();

        } catch (error) {
            console.error("[MapViewer] Failed to load map data:", error);
        }
    }

    setupMapInteractions() {
        if (this.isMobile) {
            // Touch-specific interactions for mobile
            this.map.on("touchstart", "boroughs", (event) => {
                if (event.features.length && !this.state.isZoomedIn) {
                    // Touch feedback disabled - users get immediate sidebar instead
                    this.showTouchFeedback(event.features[0], event.lngLat);
                }
            });

            this.map.on("click", "boroughs", (event) => {
                if (this.state.interactionsEnabled && event.features.length && !this.state.isZoomedIn) {
                    this.handleBoroughClick(event.features[0]);
                }
            });
        } else {
            // Desktop mouse interactions
            this.map.on("mouseenter", "boroughs", () => {
                if (this.state.interactionsEnabled && !this.state.isZoomedIn) {
                    this.map.getCanvas().style.cursor = "pointer";
                }
            });

            this.map.on("mouseleave", "boroughs", () => {
                if (!this.state.isZoomedIn) {
                    this.map.getCanvas().style.cursor = "";
                }
            });

            // Mouse move for hover effects
            this.map.on("mousemove", "boroughs", (event) => {
                if (this.state.isZoomedIn) return;
                if (!this.state.interactionsEnabled || !event.features.length) return;

                const feature = event.features[0];
                const featureId = feature.id;
                const boroughKey = feature.properties.borough_key;

                if (this.state.currentHoveredFeature !== featureId) {
                    // Remove previous hover state
                    if (this.state.currentHoveredFeature !== null) {
                        this.map.setFeatureState({
                            source: "boroughs",
                            id: this.state.currentHoveredFeature
                        }, { hovered: false });
                    }

                    // Set new hover state
                    this.state.currentHoveredFeature = featureId;
                    this.state.currentHoveredBoroughKey = boroughKey;
                    this.map.setFeatureState({
                        source: "boroughs",
                        id: featureId
                    }, { hovered: true });

                    this.showHoverPopup(feature, event.lngLat);
                }
            });

            // Mouse leave to clear hover states
            this.map.on("mouseleave", "boroughs", () => {
                if (this.state.isZoomedIn) return;

                if (this.state.currentHoveredFeature !== null) {
                    this.map.setFeatureState({
                        source: "boroughs",
                        id: this.state.currentHoveredFeature
                    }, { hovered: false });

                    this.state.currentHoveredFeature = null;
                    this.state.currentHoveredBoroughKey = null;
                }

                this.hideHoverPopup();
            });

            // Click handling
            this.map.on("click", "boroughs", (event) => {
                if (this.state.interactionsEnabled && event.features.length && !this.state.isZoomedIn) {
                    this.handleBoroughClick(event.features[0]);
                }
            });
        }
    }

    formatBoroughName(boroughKey) {
        if (!boroughKey || typeof boroughKey !== "string") {
            return "Unknown Borough";
        }
        return boroughKey.split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    updateSidebar(boroughName = null) {
        if (!boroughName) {
            this.ui.boroughInfo.innerHTML = `
                <div class="no-selection">
                    <h3>Select a borough</h3>
                <p>Click on any borough to view detailed information.</p>
                </div>
            `;
            this.ui.sidebar.classList.remove("borough-selected");
            this.ui.sidebar.classList.remove("slide-in");
            this.ui.sidebar.classList.add("slide-out");
            // Remove body class to show search on mobile
            document.body.classList.remove("mobile-sidebar-open");
            setTimeout(() => {
                this.ui.sidebar.classList.add("hidden");
            }, CONSTANTS.TIMING.SIDEBAR_ANIMATION_DELAY);
            return;
        }

        const boroughKey = boroughName.toLowerCase().replace(/[& ]/g, "_");
        const boroughInfo = this.boroughData[boroughKey];

        if (!boroughInfo) return;

        // Generate links HTML
        const linksHtml = boroughInfo.links && boroughInfo.links.length > 0 ?
            `<div class="borough-links-container" style="display: flex; flex-direction: column; gap: 8px;">
                ${boroughInfo.links.map(link => `
                <a href="${link.href}" class="sidebar-link" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; color: #3B82F6; text-decoration: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6" width="16" height="16" style="margin-right: 8px; flex-shrink: 0;">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span>${link.text}</span>
                </a>
            `).join("")}
            </div>` : "";

        this.ui.boroughInfo.innerHTML = `
            <div class="borough-detail">
                <div class="borough-image">
                    <img src="${boroughInfo.image}" alt="${boroughInfo.name}" loading="lazy">
                </div>
                <h2>${boroughInfo.name}</h2>
                <div class="borough-actions">
                    ${linksHtml}
                </div>
                <hr class="separator">
                <div class="borough-rich-text">
                    ${boroughInfo.richText}
                </div>
            </div>
        `;

        // Show sidebar with animation
        this.ui.sidebar.classList.remove("hidden");
        this.ui.sidebar.classList.add("slide-out");
        this.ui.sidebar.offsetWidth; // Force reflow
        this.ui.sidebar.classList.remove("slide-out");
        this.ui.sidebar.classList.add("slide-in", "borough-selected");
    }

    updateSearchState() {
        if (this.state.isZoomedIn) {
            this.ui.searchContainer.classList.add("zoomed-in");
            this.ui.postcodeSearch.placeholder = "Click here to reset view";
        } else {
            this.ui.searchContainer.classList.remove("zoomed-in");
            this.ui.postcodeSearch.placeholder = "Search by postcode...";
        }
    }

    showHoverPopup(feature, lngLat) {
        // Don't show hover popup on mobile - mobile uses touch interactions
        if (this.isMobile) {
            return;
        }

        this.hideHoverPopup();

        const boroughKey = feature.properties.borough_key;
        const boroughName = this.formatBoroughName(boroughKey);
        const centroid = this.calculatePolygonCentroid(feature);

        if (!centroid) return;

        this.state.hoverPopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            closeOnMove: false,
            anchor: "bottom",
            offset: [0, -10],
            className: "borough-hover-popup"
        })
            .setLngLat([centroid.lng, centroid.lat])
            .setHTML(`<div class="popup-content">${boroughName}</div>`)
            .addTo(this.map);

        // Make popup non-interactive
        const popupElement = this.state.hoverPopup.getElement();
        if (popupElement) {
            popupElement.style.pointerEvents = "none";
            popupElement.style.userSelect = "none";
        }
    }

    hideHoverPopup() {
        if (this.state.hoverPopup) {
            this.state.hoverPopup.remove();
            this.state.hoverPopup = null;
        }
    }

    showPersistentPopup() {
        // Don't show persistent popup on mobile - users get full sidebar instead
        if (this.isMobile) {
            return;
        }

        if (!this.state.isZoomedIn || !this.state.currentSelectedFeature || !this.state.storedPopupPosition) {
            return;
        }

        const boroughName = this.formatBoroughName(this.state.currentSelectedBoroughKey);

        this.hideHoverPopup();

        this.state.hoverPopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            closeOnMove: false,
            anchor: "bottom",
            offset: [0, -10],
            className: "borough-hover-popup"
        })
            .setLngLat(this.state.storedPopupPosition)
            .setHTML(`<div class="popup-content">${boroughName}</div>`)
            .addTo(this.map);

        // Make popup non-interactive
        const popupElement = this.state.hoverPopup.getElement();
        if (popupElement) {
            popupElement.style.pointerEvents = "none";
            popupElement.style.userSelect = "none";
        }
    }

    addPopupStyles() {
        const style = document.createElement("style");
        style.textContent = `
            .borough-hover-popup .maplibregl-popup-content {
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                pointer-events: none !important;
                user-select: none !important;
                border: none;
                min-width: auto;
            }
            
            .borough-hover-popup .maplibregl-popup-tip {
                border-top-color: rgba(0, 0, 0, 0.8);
                pointer-events: none !important;
            }
            
            .borough-hover-popup .popup-content {
                margin: 0;
                padding: 0;
                white-space: nowrap;
                pointer-events: none !important;
                user-select: none !important;
            }
            
            .touch-feedback-popup .maplibregl-popup-content {
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                pointer-events: none !important;
                user-select: none !important;
                border: none;
                min-width: auto;
            }
            
            .touch-feedback-popup .maplibregl-popup-tip {
                border-top-color: rgba(0, 0, 0, 0.85);
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    handleBoroughClick(feature) {
        if (!this.state.interactionsEnabled || this.state.isZoomedIn) return;

        const boroughKey = feature.properties.borough_key;
        const boroughName = this.formatBoroughName(boroughKey);

        // Reset previous selection
        this.resetSelection();

        // Set new selection
        this.state.currentSelectedFeature = feature.id;
        this.state.currentSelectedBoroughKey = boroughKey;
        this.state.selectedBorough = boroughName;

        // Store popup position (desktop only - mobile doesn't use persistent popups)
        if (!this.isMobile) {
            if (this.state.hoverPopup) {
                this.state.storedPopupPosition = this.state.hoverPopup.getLngLat();
            } else {
                const centroid = this.calculatePolygonCentroid(feature);
                if (centroid) {
                    this.state.storedPopupPosition = [centroid.lng, centroid.lat];
                }
            }
        }

        // Set hover state for visual feedback
        this.map.setFeatureState({
            source: "boroughs",
            id: feature.id
        }, { hovered: true });

        this.state.currentHoveredFeature = feature.id;
        this.state.currentHoveredBoroughKey = boroughKey;

        // Update sidebar and zoom - different behavior for mobile vs desktop
        this.updateSidebar(boroughName);

        if (this.isMobile) {
            this.zoomToBoroughMobile(feature);
        } else {
            this.zoomToBorough(feature, () => { });
        }
    }

    zoomToBorough(feature, callback) {
        const boroughKey = feature.properties.borough_key;
        const boroughName = this.formatBoroughName(boroughKey);

        // Disable interactions during zoom
        this.state.interactionsEnabled = false;

        const bbox = turf.bbox(feature);
        const centroid = turf.centroid(feature).geometry.coordinates;
        const bounds = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];

        if (bbox && centroid) {
            this.map.fitBounds(bounds, {
                padding: CONSTANTS.PADDING.DESKTOP_BOROUGH,
                maxZoom: CONSTANTS.ZOOM.DESKTOP_BOROUGH_MAX,
                linear: true,
                duration: 500,
                essential: true
            });

            this.map.once("moveend", () => {
                this.state.isZoomedIn = true;
                this.state.interactionsEnabled = true;
                this.state.optimalZoom = this.map.getZoom();

                // Restore hover state
                if (this.state.currentSelectedFeature) {
                    this.map.setFeatureState({
                        source: "boroughs",
                        id: this.state.currentSelectedFeature
                    }, { hovered: true });
                }

                this.showZoomControl();
                this.showPersistentPopup();

                // Show sidebar with animation
                if (this.ui.sidebar) {
                    this.ui.sidebar.classList.remove("hidden");
                    this.ui.sidebar.classList.add("slide-out");
                    this.ui.sidebar.offsetWidth; // Force reflow
                    this.ui.sidebar.classList.remove("slide-out");
                    this.ui.sidebar.classList.add("slide-in");
                }
            });
        }
    }

    calculateFeatureBounds(feature) {
        try {
            const geometry = feature.geometry;
            if (!geometry || !geometry.coordinates) return null;

            let bounds = new maplibregl.LngLatBounds();

            switch (geometry.type) {
                case "Point":
                    bounds.extend([geometry.coordinates[0], geometry.coordinates[1]]);
                    break;
                case "Polygon":
                    geometry.coordinates.forEach(ring => {
                        ring.forEach(coord => bounds.extend([coord[0], coord[1]]));
                    });
                    break;
                case "MultiPolygon":
                    geometry.coordinates.forEach(polygon => {
                        polygon.forEach(ring => {
                            ring.forEach(coord => bounds.extend([coord[0], coord[1]]));
                        });
                    });
                    break;
                default:
                    return null;
            }

            return bounds;
        } catch (error) {
            return null;
        }
    }

    calculatePolygonCentroid(feature) {
        try {
            const geometry = feature.geometry;

            if (geometry.type === "Point") {
                return new maplibregl.LngLat(geometry.coordinates[0], geometry.coordinates[1]);
            }

            let largestPolygon;
            if (geometry.type === "Polygon") {
                largestPolygon = geometry.coordinates;
            } else if (geometry.type === "MultiPolygon") {
                // Find the largest polygon by area
                largestPolygon = geometry.coordinates.reduce((largest, current) => {
                    return this.calculatePolygonArea(current[0]) > (largest ? this.calculatePolygonArea(largest[0]) : 0)
                        ? current : largest;
                });
            } else {
                return null;
            }

            return this.calculateRingCentroid(largestPolygon[0]);
        } catch (error) {
            // Fallback to bounds center
            const bounds = this.calculateFeatureBounds(feature);
            return bounds ? bounds.getCenter() : null;
        }
    }

    calculateRingCentroid(ring) {
        let area = 0;
        let x = 0;
        let y = 0;
        const length = ring.length - 1;

        for (let i = 0; i < length; i++) {
            const j = (i + 1) % length;
            const xi = ring[i][0];
            const yi = ring[i][1];
            const xj = ring[j][0];
            const yj = ring[j][1];
            const a = xi * yj - xj * yi;
            area += a;
            x += (xi + xj) * a;
            y += (yi + yj) * a;
        }

        area /= 2;

        if (Math.abs(area) < 1e-10) {
            // Fallback to simple average for degenerate polygons
            const avgX = ring.reduce((sum, coord) => sum + coord[0], 0) / length;
            const avgY = ring.reduce((sum, coord) => sum + coord[1], 0) / length;
            return new maplibregl.LngLat(avgX, avgY);
        }

        return new maplibregl.LngLat(x / (6 * area), y / (6 * area));
    }

    calculatePolygonArea(ring) {
        let area = 0;
        const length = ring.length - 1;

        for (let i = 0; i < length; i++) {
            const j = (i + 1) % length;
            area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
        }

        return Math.abs(area) / 2;
    }

    resetView() {
        this.logViewportDebugInfo('RESET_VIEW_START');

        // Reset selections and states
        this.resetSelection();
        this.resetHoverStates();
        this.hideHoverPopup();
        this.state.storedPopupPosition = null;

        // Reset map view
        if (this.turfBoroughsBbox) {
            const bounds = this.turfBoroughsBbox;
            if (this.isMobile) {
                const mobileOptions = {
                    padding: CONSTANTS.PADDING.MOBILE_BASE,
                    maxZoom: CONSTANTS.ZOOM.MOBILE_BASE,
                    duration: 500
                };
                this.logViewportDebugInfo('MOBILE_FITBOUNDS', {
                    bounds: bounds,
                    options: mobileOptions,
                    method: 'fitBounds'
                });
                // On mobile, use fitBounds with mobile-specific padding for proper centering
                this.map.fitBounds(bounds, mobileOptions);
            } else {
                const desktopOptions = { padding: CONSTANTS.PADDING.DESKTOP_DEFAULT, duration: 500 };
                this.logViewportDebugInfo('DESKTOP_FITBOUNDS', {
                    bounds: bounds,
                    options: desktopOptions,
                    method: 'fitBounds'
                });
                this.map.fitBounds(bounds, desktopOptions);
            }
        } else {
            const fallbackOptions = {
                center: CONSTANTS.MAP.FALLBACK_CENTER,
                zoom: CONSTANTS.ZOOM.FALLBACK,
                duration: 500,
                essential: true
            };
            this.logViewportDebugInfo('FALLBACK_EASETO', {
                options: fallbackOptions,
                method: 'easeTo',
                reason: 'no_borough_bounds'
            });
            this.map.easeTo(fallbackOptions);
        }

        this.state.isZoomedIn = false;
        this.state.interactionsEnabled = true;

        // Note: Cooperative gestures handling removed due to MapLibre version compatibility

        this.hideZoomControl();

        // Hide sidebar with animation
        if (this.ui.sidebar) {
            this.ui.sidebar.classList.remove("slide-in");
            this.ui.sidebar.classList.add("slide-out");
            // Remove body class to show search on mobile
            document.body.classList.remove("mobile-sidebar-open");
            setTimeout(() => {
                this.ui.sidebar.classList.add("hidden");
            }, CONSTANTS.TIMING.SIDEBAR_ANIMATION_DELAY);
        }

        this.clearSearch();
    }

    resetSelection() {
        if (this.state.currentSelectedFeature !== null &&
            this.map.getSource("boroughs") &&
            this.state.currentSelectedFeature !== undefined) {
            try {
                this.map.setFeatureState({
                    source: "boroughs",
                    id: this.state.currentSelectedFeature
                }, { hovered: false });
            } catch (error) {
                console.warn("Failed to reset feature state:", error);
            }
        }

        this.state.currentSelectedFeature = null;
        this.state.currentSelectedBoroughKey = null;
        this.state.selectedBorough = null;
    }

    resetHoverStates() {
        if (this.state.currentHoveredFeature !== null &&
            this.map.getSource("boroughs") &&
            this.state.currentHoveredFeature !== undefined) {
            try {
                this.map.setFeatureState({
                    source: "boroughs",
                    id: this.state.currentHoveredFeature
                }, { hovered: false });
            } catch (error) {
                console.warn("Failed to reset hover state:", error);
            }

            this.state.currentHoveredFeature = null;
            this.state.currentHoveredBoroughKey = null;
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    clearSearch() {
        this.ui.postcodeSearch.value = "";
        this.ui.autocompleteDropdown.innerHTML = "";
        this.ui.autocompleteDropdown.classList.add("hidden");
        this.ui.searchError.classList.add("hidden");
        this.ui.searchClearBtn.classList.add("hidden");
    }

    clearSearchResults() {
        this.ui.autocompleteDropdown.innerHTML = "";
        this.ui.autocompleteDropdown.classList.add("hidden");
        this.ui.searchError.classList.add("hidden");
    }

    async handlePostcodeSearch(query) {
        query = query.trim();

        if (query.length < CONSTANTS.SEARCH.MIN_CHARS) {
            this.clearSearchResults();
            if (query.length === CONSTANTS.SEARCH.CLEAR_THRESHOLD) {
                this.ui.searchClearBtn.classList.add("hidden");
            }
            return;
        }

        this.ui.searchClearBtn.classList.remove("hidden");
        this.ui.searchSpinner.classList.remove("hidden");
        this.ui.searchError.classList.add("hidden");

        // Abort previous request
        if (this.state.searchAbortController) {
            this.state.searchAbortController.abort();
        }

        this.state.searchAbortController = new AbortController();
        const { signal } = this.state.searchAbortController;

        try {
            const suggestions = await this.fetchAutocompleteSuggestions(query, signal);
            if (!suggestions) {
                this.displaySearchError("No suggestions found.");
                return;
            }

            const validatedResults = await this.validatePostcodes(suggestions, signal);
            this.displaySuggestions(validatedResults);

        } catch (error) {
            if (error.name !== "AbortError") {
                this.displaySearchError("Could not fetch postcode data.");
            }
        } finally {
            this.ui.searchSpinner.classList.add("hidden");
        }
    }

    async fetchAutocompleteSuggestions(query, signal) {
        const response = await fetch(
            `https://api.postcodes.io/postcodes/${encodeURIComponent(query)}/autocomplete?limit=${CONSTANTS.SEARCH.AUTOCOMPLETE_LIMIT}`,
            { signal }
        );

        if (!response.ok) {
            throw new Error("Autocomplete API request failed");
        }

        const data = await response.json();
        return data.result;
    }

    async validatePostcodes(postcodes, signal) {
        if (!postcodes || postcodes.length === 0) return [];

        const response = await fetch("https://api.postcodes.io/postcodes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postcodes }),
            signal
        });

        if (!response.ok) {
            throw new Error("Bulk validation API request failed");
        }

        const data = await response.json();
        return data.result
            .filter(item => item.result && this.supportedBoroughs.has(
                item.result.admin_district.toLowerCase().replace(/ /g, "_")
            ))
            .map(item => ({
                postcode: item.result.postcode,
                borough: item.result.admin_district
            }));
    }

    displaySuggestions(results) {
        this.ui.autocompleteDropdown.innerHTML = "";

        if (results.length === 0) {
            this.ui.autocompleteDropdown.classList.add("hidden");
            return;
        }

        results.forEach(result => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.innerHTML = `
                <span class="autocomplete-postcode">${result.postcode}</span> 
                <span class="autocomplete-borough">${result.borough}</span>
            `;

            item.addEventListener("click", (event) => {
                event.stopPropagation();

                const boroughKey = result.borough.toLowerCase().replace(/ /g, "_");
                const features = this.map.querySourceFeatures("boroughs", {
                    filter: ["==", ["get", "borough_key"], boroughKey]
                });

                if (features.length > 0) {
                    this.handleBoroughClick(features[0]);
                }

                this.clearSearch();
            });

            this.ui.autocompleteDropdown.appendChild(item);
        });

        this.ui.autocompleteDropdown.classList.remove("hidden");
    }

    displaySearchError(message) {
        const errorElement = this.ui.searchError.querySelector(".error-message");
        errorElement.textContent = message;
        this.ui.searchError.classList.remove("hidden");
        this.ui.autocompleteDropdown.classList.add("hidden");
    }

    showZoomControl() {
        if (this.state.zoomControl) {
            this.state.zoomControl.classList.remove("hidden");
            return;
        }

        // Create zoom control
        this.state.zoomControl = document.createElement("div");
        this.state.zoomControl.className = "lbm-map-control custom-zoom-control";
        this.state.zoomControl.style.top = "calc(64px + var(--lbm-space-3))";
        this.state.zoomControl.innerHTML = `
                <div class="lbm-zoom-control">
                    <button class="lbm-zoom-btn" aria-label="Zoom in">+</button>
                    <button class="lbm-zoom-btn" aria-label="Zoom out">-</button>
            </div>
        `;

        // Add to DOM
        const mapViewport = document.getElementById("map-viewport");
        const mapLegend = mapViewport.querySelector(".map-legend");

        if (mapLegend && mapLegend.nextSibling) {
            mapViewport.insertBefore(this.state.zoomControl, mapLegend.nextSibling);
        } else if (mapLegend) {
            mapViewport.appendChild(this.state.zoomControl);
        } else {
            this.map.getContainer().appendChild(this.state.zoomControl);
        }

        // Add event listeners
        const zoomInBtn = this.state.zoomControl.querySelector(".lbm-zoom-btn:first-child");
        const zoomOutBtn = this.state.zoomControl.querySelector(".lbm-zoom-btn:last-child");

        const updateButtonStates = () => {
            const currentZoom = this.map.getZoom();
            const minZoom = this.state.optimalZoom - 1;

            // Zoom in button
            if (currentZoom >= this.state.optimalZoom + 1) {
                zoomInBtn.disabled = true;
                zoomInBtn.style.opacity = "0.5";
                zoomInBtn.style.cursor = "not-allowed";
            } else {
                zoomInBtn.disabled = false;
                zoomInBtn.style.opacity = "1";
                zoomInBtn.style.cursor = "pointer";
            }

            // Zoom out button
            if (currentZoom <= minZoom) {
                zoomOutBtn.disabled = true;
                zoomOutBtn.style.opacity = "0.5";
                zoomOutBtn.style.cursor = "not-allowed";
            } else {
                zoomOutBtn.disabled = false;
                zoomOutBtn.style.opacity = "1";
                zoomOutBtn.style.cursor = "pointer";
            }
        };

        zoomInBtn.addEventListener("click", () => {
            if (zoomInBtn.disabled) return;

            const maxZoom = this.state.optimalZoom + 1;
            let newZoom = Math.min(this.map.getZoom() + 0.5, maxZoom);
            this.map.easeTo({ zoom: newZoom, duration: 400, essential: true });
        });

        zoomOutBtn.addEventListener("click", () => {
            if (zoomOutBtn.disabled) return;

            const minZoom = this.state.optimalZoom - 1;
            let newZoom = Math.max(this.map.getZoom() - 0.5, minZoom);
            this.map.easeTo({ zoom: newZoom, duration: 400, essential: true });
        });

        this._zoomButtonUpdateHandler = updateButtonStates;
        this.map.on("zoom", this._zoomButtonUpdateHandler);
        updateButtonStates();

        // Add wheel zoom handler
        this._zoomWheelHandler = (event) => {
            if (!this.state.isZoomedIn) return;

            event.preventDefault();

            const delta = event.deltaY < 0 ? 0.5 : -0.5;
            const minZoom = this.state.optimalZoom - 1;
            const maxZoom = this.state.optimalZoom + 1;

            let newZoom = this.map.getZoom() + delta;
            newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

            this.map.easeTo({ zoom: newZoom, duration: 200, essential: true });
        };

        this.map.getContainer().addEventListener("wheel", this._zoomWheelHandler, { passive: false });
    }

    hideZoomControl() {
        if (this.state.zoomControl) {
            this.state.zoomControl.classList.add("hidden");
        }

        // Remove event listeners
        if (this._zoomWheelHandler) {
            this.map.getContainer().removeEventListener("wheel", this._zoomWheelHandler);
        }

        if (this._zoomButtonUpdateHandler) {
            this.map.off("zoom", this._zoomButtonUpdateHandler);
        }
    }

    generateBoroughCards() {
        const cardsGrid = document.getElementById("cards-grid");
        const cardsViewport = document.getElementById("cards-viewport");

        if (!cardsGrid) {
            console.warn("Cards grid element not found");
            return;
        }

        cardsGrid.innerHTML = "";

        Object.keys(this.boroughData).forEach(boroughKey => {
            const boroughInfo = this.boroughData[boroughKey];
            const card = this.createBoroughCard(boroughKey, boroughInfo);
            cardsGrid.appendChild(card);
        });
    }

    createBoroughCard(boroughKey, boroughInfo) {
        const card = document.createElement("div");
        card.className = "borough-card";
        card.dataset.borough = boroughKey;

        const linksHtml = boroughInfo.links && boroughInfo.links.length > 0 ?
            boroughInfo.links.map(link => `
                <a href="${link.href}" target="_blank" rel="noopener noreferrer" class="borough-card-link">
                    ${link.text}
                </a>
            `).join("") : "";

        card.innerHTML = `
            <div class="borough-card-title">${boroughInfo.name}</div>
            <div class="borough-card-image">
                <img src="${boroughInfo.image}" alt="${boroughInfo.name}" loading="lazy" />
            </div>
            <div class="borough-card-info">
                ${linksHtml ? `<div class="borough-card-links">${linksHtml}</div>` : ""}
            </div>
        `;

        return card;
    }

    createStyleSwitcher() {
        const styleSwitcherContainer = document.getElementById("style-switcher-container");
        if (!styleSwitcherContainer) return;

        styleSwitcherContainer.className = "lbm-map-control style-switcher";
        styleSwitcherContainer.style.top = "calc(var(--lbm-space-5) + 64px + var(--lbm-space-3))";
        styleSwitcherContainer.innerHTML = `
            <div class="lbm-p-md">
                <h3 class="lbm-map-control__title">
                    ${CONSTANTS.MAPTILER_STYLES[this.state.currentStyleIndex].name}
                </h3>
                <button class="lbm-btn lbm-btn--primary lbm-btn--full lbm-text-xs">
                    Next Style
                </button>
            </div>
        `;

        const switchButton = styleSwitcherContainer.querySelector("button");
        switchButton.addEventListener("click", () => {
            this.cycleMapStyle();
        });
    }

    cycleMapStyle() {
        this.state.currentStyleIndex = (this.state.currentStyleIndex + 1) % CONSTANTS.MAPTILER_STYLES.length;
        const style = CONSTANTS.MAPTILER_STYLES[this.state.currentStyleIndex];

        const titleElement = document.querySelector(".lbm-map-control__title");
        if (titleElement) {
            titleElement.textContent = style.name;
        }

        if (style.isCustom) {
            this.createCustomStyle(style);
        } else {
            this.map.setStyle(style.url);
            this.map.once("styledata", () => {
                if (this.originalGeoJSONData) {
                    this.addBoroughLayers();
                }
            });
        }
    }

    async createCustomStyle(styleConfig) {
        try {
            const baseStyle = styleConfig.baseStyle;
            const textStyle = styleConfig.textStyle;

            const baseStyleUrl = `https://api.maptiler.com/maps/${baseStyle}/style.json?key=${MAPTILER_API_KEY}`;
            const textStyleUrl = `https://api.maptiler.com/maps/${textStyle}-v2/style.json?key=${MAPTILER_API_KEY}`;

            const [baseResponse, textResponse] = await Promise.all([
                fetch(baseStyleUrl),
                fetch(textStyleUrl)
            ]);

            const baseStyleData = await baseResponse.json();
            const textStyleData = await textResponse.json();

            // Extract text layers from text style
            const textLayers = textStyleData.layers
                .filter(layer => layer.type === "symbol" && layer.layout && layer.layout["text-field"])
                .map((layer, index) => ({
                    ...layer,
                    id: `custom-text-${layer.id}-${index}`
                }));

            // Combine styles
            const customStyle = {
                ...baseStyleData,
                sources: {
                    ...baseStyleData.sources,
                    ...textStyleData.sources
                },
                layers: [
                    ...baseStyleData.layers,
                    ...textLayers
                ]
            };

            this.map.setStyle(customStyle);
            this.map.once("styledata", () => {
                if (this.originalGeoJSONData) {
                    this.addBoroughLayers();
                }
            });

        } catch (error) {
            console.error("Failed to create custom style:", error);
            // Fallback to default style
            this.map.setStyle(CONSTANTS.MAPTILER_STYLES[4].url);
            this.map.once("styledata", () => {
                if (this.originalGeoJSONData) {
                    this.addBoroughLayers();
                }
            });
        }
    }

    addBoroughLayers() {
        // Remove existing layers
        if (this.map.getLayer("boroughs")) this.map.removeLayer("boroughs");
        if (this.map.getLayer("borough-borders")) this.map.removeLayer("borough-borders");

        // Add source if it doesn't exist
        if (!this.map.getSource("boroughs")) {
            this.map.addSource("boroughs", {
                type: "geojson",
                data: this.originalGeoJSONData,
                promoteId: "borough_key"
            });
        }

        // Find appropriate layer to insert before (text layers)
        const mapStyle = this.map.getStyle();
        let beforeLayerId = null;

        if (mapStyle && mapStyle.layers) {
            for (const layer of mapStyle.layers) {
                if (layer.type === "symbol" && layer.layout && layer.layout["text-field"]) {
                    beforeLayerId = layer.id;
                    break;
                }
            }
        }

        // Add borough fill layer
        this.map.addLayer({
            id: "boroughs",
            type: "fill",
            source: "boroughs",
            layout: {},
            paint: {
                "fill-color": [
                    "case",
                    ["boolean", ["feature-state", "hovered"], false],
                    CONSTANTS.COLORS.HOVER,
                    CONSTANTS.COLORS.BASE
                ],
                "fill-opacity": 0.7
            }
        }, beforeLayerId);

        // Add borough border layer
        this.map.addLayer({
            id: "borough-borders",
            type: "line",
            source: "boroughs",
            layout: {},
            paint: {
                "line-color": CONSTANTS.COLORS.BORDER,
                "line-width": 2,
                "line-opacity": 0.8
            }
        }, beforeLayerId);

        // Setup interactions
        this.setupMapInteractions();
    }

    setupResponsiveHandlers() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= CONSTANTS.BREAKPOINTS.MOBILE;

            if (wasMobile !== this.isMobile) {
                this.logViewportDebugInfo('BREAKPOINT_CHANGE', { wasMobile, isMobile: this.isMobile });
                this.handleBreakpointChange();
            }
        });
    }

    handleBreakpointChange() {
        this.logViewportDebugInfo('INTERACTION_UPDATE', {
            touchZoomRotate: this.isMobile,
            scrollZoom: false,              // Always disabled
            doubleClickZoom: !this.isMobile,
            cooperativeGestures: this.isMobile // Enable on mobile to prevent scroll hijacking
        });

        // Update map interactions based on screen size
        this.map.touchZoomRotate.enable(this.isMobile ? true : false);
        // Scroll zoom remains disabled to prevent page scroll conflicts
        this.map.doubleClickZoom.enable(this.isMobile ? false : true);
        
        // Note: Cooperative gestures handling removed due to MapLibre version compatibility

        // Reset any zoomed state when switching between mobile/desktop
        if (this.state.isZoomedIn) {
            this.logViewportDebugInfo('RESET_ON_BREAKPOINT', { reason: 'switching_device_mode' });
            this.resetView();
        }
    }

    zoomToBoroughMobile(feature) {
        // Mobile-specific zoom behavior
        const bbox = turf.bbox(feature);
        const bounds = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
        const options = {
            padding: CONSTANTS.PADDING.MOBILE_BOROUGH,
            maxZoom: CONSTANTS.ZOOM.MOBILE_BOROUGH_MAX,   // Less aggressive zoom on mobile
            duration: 400,
            essential: true
        };

        this.logViewportDebugInfo('MOBILE_BOROUGH_ZOOM', {
            borough: feature.properties?.LAD23NM || 'Unknown',
            bbox: bbox,
            bounds: bounds,
            options: options,
            method: 'fitBounds'
        });

        this.map.fitBounds(bounds, options);

        this.state.isZoomedIn = true;
        
        // Note: Cooperative gestures handling removed due to MapLibre version compatibility
        
        this.showMobileSidebar();
    }

    showMobileSidebar() {
        if (this.isMobile && this.ui.sidebar) {
            this.ui.sidebar.classList.remove("hidden");
            this.ui.sidebar.classList.remove("slide-out");
            this.ui.sidebar.classList.add("slide-in");
            // Add class to body to hide search on mobile
            document.body.classList.add("mobile-sidebar-open");
        }
    }

    showTouchFeedback(feature, lngLat) {
        // Disabled: No popups on mobile - users get immediate sidebar feedback instead
        return;
    }

    logViewportDebugInfo(event, additionalData = {}) {
        if (!this.map) return;

        const viewport = {
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            isMobile: this.isMobile,
            breakpoint: this.isMobile ? 'MOBILE' : 'DESKTOP'
        };

        const mapState = {
            zoom: this.map.getZoom(),
            center: this.map.getCenter(),
            bounds: this.map.getBounds(),
            padding: this.map.getPadding ? this.map.getPadding() : 'N/A',
            pitch: this.map.getPitch(),
            bearing: this.map.getBearing()
        };

        const interactionState = {
            touchZoomRotate: this.map.touchZoomRotate?.isEnabled() || false,
            scrollZoom: this.map.scrollZoom?.isEnabled() || false,
            doubleClickZoom: this.map.doubleClickZoom?.isEnabled() || false,
            isZoomedIn: this.state?.isZoomedIn || false
        };

        const constants = {
            mobileBreakpoint: CONSTANTS.BREAKPOINTS.MOBILE,
            zoomLevels: {
                min: CONSTANTS.ZOOM.MIN,
                max: CONSTANTS.ZOOM.MAX,
                desktopInitial: CONSTANTS.ZOOM.DESKTOP_INITIAL,
                mobileBase: CONSTANTS.ZOOM.MOBILE_BASE,
                mobileBoroughMax: CONSTANTS.ZOOM.MOBILE_BOROUGH_MAX
            },
            padding: {
                desktop: CONSTANTS.PADDING.DESKTOP_DEFAULT,
                mobileBase: CONSTANTS.PADDING.MOBILE_BASE,
                mobileBorough: CONSTANTS.PADDING.MOBILE_BOROUGH
            }
        };

        console.group(`🔍 [VIEWPORT DEBUG] ${event}`);
        console.log('📱 Viewport:', viewport);
        console.log('🗺️  Map State:', mapState);
        console.log('🎮 Interactions:', interactionState);
        console.log('⚙️  Constants:', constants);
        if (Object.keys(additionalData).length > 0) {
            console.log('📋 Additional Data:', additionalData);
        }
        console.groupEnd();
    }
}

// Initialize map when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    // Check for required dependencies
    if (typeof maplibregl === 'undefined') {
        console.error("[MapViewer] MapLibre GL JS not loaded!");
        return;
    }

    if (typeof turf === 'undefined') {
        console.error("[MapViewer] Turf.js not loaded!");
        return;
    }

    // Check for map container
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
        console.error("[MapViewer] Map container 'map' not found!");
        return;
    }

    setTimeout(() => {
        try {
            window.mapViewer = new MapLibreBoroughMap("map");
        } catch (error) {
            console.error("[MapViewer] Failed to initialize map viewer:", error);
        }
    }, 100);
});