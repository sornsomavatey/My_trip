(function () {
  const STORAGE_KEY = "kampotTripGoogleMapsApiKey";
  const SCRIPT_ID = "google-maps-places-script";
  const PHOTO_WIDTH = 900;
  const PHOTO_HEIGHT = 560;
  const SEARCH_DELAY_MS = 220;

  const state = {
    service: null,
    loadingScript: false,
    googleReady: false,
  };

  function getQueryFromCard(card) {
    const link = card.querySelector(".maps-photo-link");
    if (!link) return "";

    try {
      const url = new URL(link.href);
      return url.searchParams.get("query") || "";
    } catch (error) {
      return "";
    }
  }

  function setStatus(message) {
    const status = document.getElementById("placesApiStatus");
    if (status) status.textContent = message;
  }

  function getCards() {
    return Array.from(document.querySelectorAll(".photo-card")).filter(getQueryFromCard);
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.places) {
        state.googleReady = true;
        resolve();
        return;
      }

      if (state.loadingScript) {
        const started = Date.now();
        const timer = window.setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            window.clearInterval(timer);
            state.googleReady = true;
            resolve();
          }

          if (Date.now() - started > 15000) {
            window.clearInterval(timer);
            reject(new Error("Google Maps did not finish loading."));
          }
        }, 200);
        return;
      }

      state.loadingScript = true;
      window.__initKampotPlacesPhotos = function () {
        state.googleReady = true;
        resolve();
      };

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.onerror = function () {
        reject(new Error("Could not load the Google Maps script. Check the API key and network."));
      };
      script.src = "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(apiKey) +
        "&libraries=places&callback=__initKampotPlacesPhotos";
      document.head.appendChild(script);
    });
  }

  function getPlacesService() {
    if (state.service) return state.service;

    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.display = "none";
    document.body.appendChild(container);

    state.service = new window.google.maps.places.PlacesService(container);
    return state.service;
  }

  function textSearch(query) {
    return new Promise((resolve) => {
      getPlacesService().textSearch({ query }, (results, status) => {
        resolve({ results: results || [], status });
      });
    });
  }

  function choosePhoto(results) {
    const resultWithPhotos = results.find((result) => result.photos && result.photos.length);
    if (!resultWithPhotos) return null;

    return {
      place: resultWithPhotos,
      photo: resultWithPhotos.photos[0],
    };
  }

  function markCard(card, className) {
    card.classList.remove("is-loading", "is-real-photo");
    if (className) card.classList.add(className);
  }

  function addPhotoBadge(card) {
    const caption = card.querySelector("figcaption");
    if (!caption || caption.querySelector(".photo-badge")) return;

    const badge = document.createElement("span");
    badge.className = "photo-badge";
    badge.textContent = "Google Places photo";
    caption.appendChild(badge);
  }

  async function updateCardPhoto(card) {
    const query = getQueryFromCard(card);
    if (!query) return false;

    markCard(card, "is-loading");
    const { results, status } = await textSearch(query);
    const match = choosePhoto(results);

    if (!match) {
      markCard(card, "");
      card.dataset.photoStatus = status || "NO_PHOTO";
      return false;
    }

    const img = card.querySelector("img");
    if (img) {
      img.src = match.photo.getUrl({ maxWidth: PHOTO_WIDTH, maxHeight: PHOTO_HEIGHT });
      img.alt = match.place.name ? match.place.name + " Google Places photo" : query + " Google Places photo";
    }

    const mapsLink = card.querySelector(".maps-photo-link");
    if (mapsLink && match.place.place_id) {
      mapsLink.href = "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(match.place.name || query) +
        "&query_place_id=" +
        encodeURIComponent(match.place.place_id);
    }

    card.dataset.photoStatus = "OK";
    markCard(card, "is-real-photo");
    addPhotoBadge(card);
    return true;
  }

  async function loadPhotos() {
    const input = document.getElementById("placesApiKey");
    const apiKey = (input && input.value.trim()) || window.localStorage.getItem(STORAGE_KEY) || "";

    if (!apiKey) {
      setStatus("Paste a Google Maps JavaScript API key first.");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, apiKey);
    setStatus("Loading Google Places photos...");

    try {
      await loadGoogleMaps(apiKey);
    } catch (error) {
      setStatus(error.message);
      return;
    }

    const cards = getCards();
    let loaded = 0;

    for (let index = 0; index < cards.length; index += 1) {
      setStatus("Loading real photos " + (index + 1) + " / " + cards.length + "...");
      const success = await updateCardPhoto(cards[index]);
      if (success) loaded += 1;
      await sleep(SEARCH_DELAY_MS);
    }

    setStatus("Loaded " + loaded + " real Google Places photos. Cards without a match kept their fallback preview.");
  }

  function clearKey() {
    window.localStorage.removeItem(STORAGE_KEY);
    const input = document.getElementById("placesApiKey");
    if (input) input.value = "";
    setStatus("Saved API key removed from this browser.");
  }

  function init() {
    const input = document.getElementById("placesApiKey");
    const loadButton = document.getElementById("loadPlacePhotos");
    const clearButton = document.getElementById("clearPlacePhotosKey");
    const savedKey = window.localStorage.getItem(STORAGE_KEY);

    if (input && savedKey) input.value = savedKey;
    if (loadButton) loadButton.addEventListener("click", loadPhotos);
    if (clearButton) clearButton.addEventListener("click", clearKey);

    if (savedKey) {
      setStatus("Saved API key found. Click Load Real Photos to refresh the venue images.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
