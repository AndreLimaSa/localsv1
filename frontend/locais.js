const BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://localsv1.onrender.com";

async function fetchLocations() {
  try {
    const response = await fetch(`${BASE_URL}/locations`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const locations = await response.json();
    return locations;
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return [];
  }
}

let map;
let markerClusterGroup;

function initializeMap() {
  map = L.map("map").setView([0, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
  }).addTo(map);

  markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: 25,
    disableClusteringAtZoom: 15,
  });
  map.addLayer(markerClusterGroup);

  function onLocationFound(e) {
    const accuracy = e.accuracy / 2;

    L.marker(e.latlng)
      .addTo(map)
      .bindPopup(`You are within ${accuracy} meters from this point`)
      .openPopup();

    // Use CircleMarker instead of Circle
    const circleMarker = L.circleMarker(e.latlng, {
      radius: 20, // Size in pixels
      color: "blue",
      fillColor: "#3388ff",
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(map);

    // Add a tooltip to show the actual accuracy

    map.setView(e.latlng, 13);
  }

  function onLocationError(e) {
    alert(e.message);
  }

  map.on("locationfound", onLocationFound);
  map.on("locationerror", onLocationError);

  map.locate({ setView: true, maxZoom: 16 });
}

function addMarkersToMap(locations) {
  markerClusterGroup.clearLayers();
  if (locations.length === 0) {
    console.log("No locations to show on the map.");
    return;
  }

  locations.forEach((location) => {
    const marker = L.marker([location.latitude, location.longitude]);

    marker.on("click", () => {
      const popupContainer = document.getElementById("popup-container");
      popupContainer.innerHTML = `
        <div class="popup-content">
          <img class="popup-img" src="${location.src}" alt="${location.title}">
          <div class="popup-text">
            <h2>${location.title}</h2>
            <p>${location.description}</p>
          </div>
        </div>
      `;
      popupContainer.style.display = "block";
    });

    markerClusterGroup.addLayer(marker);
  });

  map.fitBounds(markerClusterGroup.getBounds());
}

// Close popup when clicking outside of it
document.addEventListener("click", function (event) {
  const popupContainer = document.getElementById("popup-container");
  const mapElement = document.getElementById("map");
  const isClickInside =
    popupContainer.contains(event.target) || mapElement.contains(event.target);

  if (!isClickInside) {
    popupContainer.style.display = "none";
  }
});

function mapbtn() {
  document.getElementById("map").style.zIndex = 100;
  document.getElementById("listabtn").style.display = "flex";
  document.getElementById("mapabtn").style.display = "none";
  document.getElementById("container-filtros").style.display = "none";
}
function listabtn() {
  document.getElementById("map").style.zIndex = 1;
  document.getElementById("listabtn").style.display = "none";
  document.getElementById("mapabtn").style.display = "flex";
  document.getElementById("container-filtros").style.display = "none";
  document.getElementById("verresultados").style.display = "none";
}

async function renderLocations(locations) {
  const userLocation = await getCurrentLocation();
  locations = locations.filter((location) => {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      location.latitude,
      location.longitude
    );

    // Add distance to each location object for later use
    location.distance = distance;

    return true; // Keep all locations (change this if you need actual filtering)
  });
  try {
    locations.sort((a, b) => a.distance - b.distance);
    const imageGrid = document.getElementById("image-grid");
    imageGrid.innerHTML = "";

    locations.forEach((location) => {
      const locationDiv = document.createElement("div");
      const totalVotes = location.likes + location.dislikes;
      const likePercentage =
        totalVotes === 0 ? 0 : (location.likes / totalVotes) * 100;
      const dislikePercentage =
        totalVotes === 0 ? 0 : (location.dislikes / totalVotes) * 100;
      locationDiv.className = "location";
      locationDiv.setAttribute("data-id", location._id);

      locationDiv.innerHTML = `
        <img src="${location.src}">
        <div class="icon-buttons">
          <button class="icon-button" onclick="likeLocation('${location._id}')">
            <i class="fas fa-thumbs-up"></i>
          </button>
          <button class="icon-button" onclick="dislikeLocation('${
            location._id
          }')">
            <i class="fas fa-thumbs-down"></i>
          </button>
          <button class="icon-button" onclick="saveFavorite('${location._id}')">
            <i class="fas fa-star"></i>
          </button>
        </div>
        <h3>${location.title}</h3>
        <p>${location.description}</p>
        <p>Distance: ${location.distance.toFixed(1)} km</p>
        <div class="location-info">
        
          <div class="progress-bar">
            <span class="likes-count">Likes: ${location.likes}</span>
            <span class="dislikes-count">Dislikes: ${location.dislikes}</span>
            <div class="like-bar" style="width: ${likePercentage}%;"></div>
            <div class="dislike-bar" style="width: ${dislikePercentage}%;"></div>
          </div>
        </div>
      `;

      imageGrid.appendChild(locationDiv);
    });
  } catch (error) {
    console.error("Error rendering locations:", error);
  }
}

// Event listeners for like and dislike buttons
async function likeLocation(locationId) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You need to log in first");
    return;
  }
  try {
    const response = await fetch(`/locations/${locationId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (response.ok) {
      updateLocationVotes(locationId, data.likes, data.dislikes);
    } else {
      console.error(data.message);
    }
  } catch (error) {
    console.error("Error liking location:", error);
  }
}

async function dislikeLocation(locationId) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You need to log in first");
    return;
  }
  try {
    const response = await fetch(`/locations/${locationId}/dislike`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (response.ok) {
      updateLocationVotes(locationId, data.likes, data.dislikes);
    } else {
      console.error(data.message);
    }
  } catch (error) {
    console.error("Error disliking location:", error);
  }
}

function updateLocationVotes(locationId, likes, dislikes) {
  const locationDiv = document.querySelector(`[data-id='${locationId}']`);
  const likesCount = locationDiv.querySelector(".likes-count");
  const dislikesCount = locationDiv.querySelector(".dislikes-count");
  const likeBar = locationDiv.querySelector(".like-bar");
  const dislikeBar = locationDiv.querySelector(".dislike-bar");

  likesCount.textContent = `Likes: ${likes}`;
  dislikesCount.textContent = `Dislikes: ${dislikes}`;

  const totalVotes = likes + dislikes;
  const likePercentage = totalVotes === 0 ? 0 : (likes / totalVotes) * 100;
  const dislikePercentage =
    totalVotes === 0 ? 0 : (dislikes / totalVotes) * 100;

  likeBar.style.width = `${likePercentage}%`;
  dislikeBar.style.width = `${dislikePercentage}%`;
}

// Function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Function to get the user's current location
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log("User's current location:", userLocation);
          resolve(userLocation);
        },
        (error) => {
          console.error("Geolocation error:", error);
          reject(error);
        }
      );
    } else {
      const error = new Error("Geolocation is not supported by this browser.");
      console.error(error.message);
      reject(error);
    }
  });
}

// Function to update the distance value displayed and call filterLocations
function updateDistanceValue(value) {
  document.getElementById("distanceValue").textContent = value;
  console.log("Distance slider value (updateDistanceValue):", value); // Log distance slider value when it changes
  filterLocations(); // Call filterLocations whenever the slider value changes
}

document.addEventListener("DOMContentLoaded", () => {
  const distanceSliderValue = document.getElementById("distanceSlider").value;
  console.log(
    "Initial distance slider value (DOMContentLoaded):",
    distanceSliderValue
  ); // Log initial distance slider value
  updateDistanceValue(distanceSliderValue);
  filterLocations(); // Initial call to load locations based on user's location and default distance
});

// Function to filter locations based on checkboxes and update the title
async function filterLocations() {
  const filterTitle = document.getElementById("filterTitle");
  const campingnaturezaCheckbox = document.getElementById(
    "campingchecknatureza"
  );
  const fotografianaturezaCheckbox = document.getElementById(
    "fotografiachecknatureza"
  );
  const meditanaturezaCheckbox = document.getElementById("meditachecknatureza");
  const caminhadanaturezaCheckbox = document.getElementById(
    "caminhadachecknatureza"
  );

  const checkcheckNatureza = document.getElementById("naturezacheck");
  const checkcheckCultura = document.getElementById("culturacheck");
  const checkcheckPraia = document.getElementById("praiacheck");
  const checkcheckTrilho = document.getElementById("trilhocheck");
  const checkcheckMerendas = document.getElementById("merendascheck");
  const distanceSlider = document.getElementById("distanceSlider");

  const checkSerra = document.getElementById("montanhabtn");
  const checkFloresta = document.getElementById("florestanat");
  const checkRio = document.getElementById("rionat");

  const checkAnimalNat = document.getElementById("animalnatureza");
  const checkPoucoMovNat = document.getElementById("poucomovnatureza");
  const checkVistasNat = document.getElementById("vistasnatureza");

  const checkMonumento = document.getElementById("monumentocul");
  const checkMuseu = document.getElementById("museucul");
  const checkIgreja = document.getElementById("igrejacul");

  const checkHistCul = document.getElementById("historicocheckcultura");
  const checkRomCul = document.getElementById("romanocheckcultura");
  const checkContCul = document.getElementById("contemporaneocheckcultura");
  const checkPreCul = document.getElementById("prehistoricocheckcultura");

  const checkFacilAceCul = document.getElementById("acessocultura");
  const checkGratuitoCul = document.getElementById("gratuitocultura");

  const checkRioPra = document.getElementById("riopra");
  const checkMarPra = document.getElementById("marpra");
  const checkCascataPra = document.getElementById("cascatapra");

  const checkBanhosPra = document.getElementById("banhoscheckpraia");
  const checkBarPra = document.getElementById("barcheckpraia");
  const checkDespPra = document.getElementById("desportocheckpraia");
  const checkCamPra = document.getElementById("caminhadacheckpraia");

  const checkCaesPra = document.getElementById("aceitacaes");
  const checkPoucoMovPra = document.getElementById("poucomovepraia");

  const checkFacilTri = document.getElementById("faciltri");
  const checkModeradoTri = document.getElementById("moderadotri");
  const checkDificilTri = document.getElementById("dificiltri");

  const checkPassTri = document.getElementById("passadicoschecktrilho");
  const checkNatTri = document.getElementById("naturezachecktrilho");
  const checkBeiTri = document.getElementById("beirariochecktrilho");
  const checkHistTri = document.getElementById("historicochecktrilho");

  const checkCamTri = document.getElementById("caminhadatrilho");
  const checkCicTri = document.getElementById("ciclismotrilho");
  const checkCorTri = document.getElementById("corridatrilho");
  const checkSinTri = document.getElementById("sinalizadotrilho");

  const checkChurrasqueiraMer = document.getElementById("churrasqueiramer");
  const checkMesasMer = document.getElementById("mesasmer");
  const checkAguaMer = document.getElementById("aguamer");

  const checkGruMer = document.getElementById("gruposcheckmerendas");
  const checkCriMer = document.getElementById("criancascheckmerendas");

  const distanceValue = distanceSlider.value;

  console.log("Distance slider value (filterLocations):", distanceValue); // Log distance slider value when filtering

  try {
    // Get user's current location
    const userLocation = await getCurrentLocation();

    // Fetch locations from backend
    const locations = await fetchLocations();

    // Create a copy of the original locations array
    let filteredLocations = [...locations];

    // Get all checkboxes
    const checkboxes = document.querySelectorAll(".ctime");

    // Add click event listener to each checkbox
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("click", function () {
        // Uncheck all checkboxes except the one that was clicked
        checkboxes.forEach((cb) => {
          if (cb !== this) {
            cb.checked = false;
          }
        });
        // Call the filter function
        applyFilters();
      });
    });

    // Function to apply filters
    function applyFilters() {
      // Reset filteredLocations to original locations array
      filteredLocations = [...locations];

      // Filter based on checked checkboxes
      if (checkcheckCultura.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Cultura")
        );
        filterTitle.textContent = "Cultura";
      } else if (checkcheckNatureza.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Natureza")
        );
        filterTitle.textContent = "Natureza";
      } else if (checkcheckPraia.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Praia")
        );
        filterTitle.textContent = "Praia";
      } else if (checkcheckTrilho.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Trilho")
        );
        filterTitle.textContent = "Trilho";
      } else if (checkcheckMerendas.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Merendas")
        );
        filterTitle.textContent = "Merendas";
      } else {
        filterTitle.textContent = "Locais";
      }
      // Filter based on Merendas checkbox
      if (campingnaturezaCheckbox.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("campingnatureza")
        );
      }
      if (fotografianaturezaCheckbox.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("fotografianatureza")
        );
      }
      if (meditanaturezaCheckbox.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("meditanatureza")
        );
      }
      if (caminhadanaturezaCheckbox.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("caminhadanatureza")
        );
      }

      if (checkSerra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("montanhanatureza")
        );
      }
      if (checkFloresta.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("florestanat")
        );
      }
      if (checkRio.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("rionat")
        );
      }
      if (checkAnimalNat.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("animalnat")
        );
      }
      if (checkPoucoMovNat.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("poucomovnat")
        );
      }

      if (checkVistasNat.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("vistasnat")
        );
      }

      if (checkMonumento.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("monumentocul")
        );
      }
      if (checkMuseu.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("museucul")
        );
      }
      if (checkIgreja.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("igrejacul")
        );
      }
      if (checkHistCul.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("historicocul")
        );
      }
      if (checkRomCul.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("romanocul")
        );
      }
      if (checkContCul.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("contemporaneocul")
        );
      }
      if (checkPreCul.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("prehistoricocul")
        );
      }
      if (checkFacilAceCul.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("facilacessocul")
        );
      }
      if (checkGratuitoCul.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("gratuitocul")
        );
      }

      if (checkRioPra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("riopra")
        );
      }
      if (checkMarPra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("marpra")
        );
      }
      if (checkCascataPra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("cascatapra")
        );
      }

      if (checkBanhosPra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("banhospra")
        );
      }
      if (checkBarPra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("barpra")
        );
      }
      if (checkDespPra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("deportopra")
        );
      }
      if (checkCamPra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("caminhadapra")
        );
      }

      if (checkCaesPra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("caespra")
        );
      }
      if (checkPoucoMovPra.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("poucomovpra")
        );
      }

      if (checkFacilTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("faciltri")
        );
      }
      if (checkModeradoTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("moderadotri")
        );
      }
      if (checkDificilTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("dificiltri")
        );
      }

      if (checkPassTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("passadicostri")
        );
      }
      if (checkNatTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("rnaturezatri")
        );
      }
      if (checkBeiTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("beirariotri")
        );
      }
      if (checkHistTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("historicotri")
        );
      }

      if (checkCamTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("caminhadatri")
        );
      }
      if (checkCicTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("ciclismotri")
        );
      }
      if (checkCorTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("corridatri")
        );
      }
      if (checkSinTri.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("sinalizadotri")
        );
      }

      if (checkChurrasqueiraMer.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("churrasqueiramer")
        );
      }
      if (checkMesasMer.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("mesasmer")
        );
      }
      if (checkAguaMer.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("aguamer")
        );
      }

      if (checkGruMer.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("grupomer")
        );
      }
      if (checkCriMer.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("criancasmer")
        );
      }

      if (checkcheckNatureza.checked) {
        document.getElementById("filtros-container-natureza").style.display =
          "block";
      }
      if (!checkcheckNatureza.checked) {
        document.getElementById("filtros-container-natureza").style.display =
          "none";
      }
      if (checkcheckCultura.checked) {
        document.getElementById("filtros-container-cultura").style.display =
          "block";
      }
      if (!checkcheckCultura.checked) {
        document.getElementById("filtros-container-cultura").style.display =
          "none";
      }
      if (checkcheckPraia.checked) {
        document.getElementById("filtros-container-praia").style.display =
          "block";
      }
      if (!checkcheckPraia.checked) {
        document.getElementById("filtros-container-praia").style.display =
          "none";
      }
      if (checkcheckTrilho.checked) {
        document.getElementById("filtros-container-trilho").style.display =
          "block";
      }
      if (!checkcheckTrilho.checked) {
        document.getElementById("filtros-container-trilho").style.display =
          "none";
      }
      if (checkcheckMerendas.checked) {
        document.getElementById("filtros-container-merendas").style.display =
          "block";
      }
      if (!checkcheckMerendas.checked) {
        document.getElementById("filtros-container-merendas").style.display =
          "none";
      }

      // Example: Filter based on distance slider value
      const updatedDistanceValue =
        document.getElementById("distanceSlider").value;
      console.log("Updated distance slider valuee:", updatedDistanceValue);

      filteredLocations = filteredLocations.filter((location) => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          location.latitude,
          location.longitude
        );

        return distance <= updatedDistanceValue;
      });

      // Clear current markers from map
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Add markers for filtered locations
      addMarkersToMap(filteredLocations);

      // Update the image grid with filtered locations
      renderLocations(filteredLocations);

      // Update the count of filtered locations
      const locationCount = filteredLocations.length;
      document.getElementById(
        "verresultados"
      ).textContent = `Mostrar ${locationCount} locais`;
    }

    // Initial call to apply filters in case any checkboxes are pre-checked
    applyFilters();
  } catch (error) {
    console.error("Error filtering locations:", error);
    // Handle error as needed
  }
}

// Function to handle checkbox clicks
function handleCheckboxClick(event) {
  const checkboxes = document.querySelectorAll(".filter-checkbox");
  checkboxes.forEach((checkbox) => {
    if (checkbox !== event.target) {
      checkbox.checked = false;
    }
  });
  filterLocations();
}

// Add event listeners to all filter checkboxes
const checkboxes = document.querySelectorAll(".filter-checkbox");
checkboxes.forEach((checkbox) => {
  checkbox.addEventListener("click", handleCheckboxClick);
});

async function saveFavorite(locationId) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You need to log in first");
    return;
  }

  const response = await fetch(`/favorites/${locationId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    alert("Location saved to favorites");
  } else {
    const data = await response.json();
    alert(data.message);
  }
}

async function getFavorites() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You need to log in first");
    return;
  }

  const response = await fetch("/user/favorites", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    console.log("Favorites:", data.favorites);
  } else {
    const data = await response.json();
    alert(data.message);
  }
}

async function login(email, password) {
  const response = await fetch("https://localsv1.onrender.com/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  /*async function login(email, password) {
  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  */
  const data = await response.json();
  if (response.ok) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.userId);
    window.location.href = "/index.html"; // Redirect after successful login
  } else {
    alert(data.message);
  }
}

async function initializeApp() {
  initializeMap();
  const locations = await fetchLocations();
  addMarkersToMap(locations);
  renderLocations(locations);
}

initializeApp();

function register() {
  const BASE_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://localsv1.onrender.com";
  window.open(`${BASE_URL}/register`, "_blank");
}

function filterbtn() {
  document.getElementById("container-filtros").style.display = "flex";
  document.getElementById("map").style.zIndex = 1;
  document.getElementById("verresultados").style.display = "block";
  document.getElementById("listabtn").style.display = "none";
  document.getElementById("mapabtn").style.display = "flex";
}

function verResultados() {
  document.getElementById("container-filtros").style.display = "none";
  document.getElementById("verresultados").style.display = "none";
}
document.addEventListener("DOMContentLoaded", () => {
  // Function to detect if the user is on a mobile device
  function isMobileDevice() {
    return /Mobi|Android/i.test(navigator.userAgent);
  }

  const numDaysInput = document.getElementById("num-days");
  const generateDaysButton = document.getElementById("generate-days");
  const tripPlanner = document.getElementById("trip-planner");
  const saveTripButton = document.getElementById("save-trip");
  const locationModal = document.getElementById("location-modal");
  const modalClose = document.querySelector(".close");
  const modalLocationList = document.getElementById("modal-location-list");
  const saveSelectionButton = document.getElementById("save-selection");
  const locationList = document.getElementById("location-list");

  let favoriteLocations = [];
  let selectedDayContainer = null;

  // Function to generate daily containers
  function generateDailyContainers(numDays) {
    tripPlanner.innerHTML = ""; // Clear existing containers

    for (let i = 1; i <= numDays; i++) {
      const dayContainer = document.createElement("div");
      dayContainer.className = "day-container";
      dayContainer.id = `day-${i}`;
      dayContainer.innerHTML = `
        <h3>Day ${i}</h3>
        <button class="select-locations">Select Locations</button>
        <ul class="day-location-list"></ul>
      `;
      tripPlanner.appendChild(dayContainer);
    }

    document.querySelectorAll(".select-locations").forEach((button) => {
      button.addEventListener("click", (e) => {
        selectedDayContainer = e.target
          .closest(".day-container")
          .querySelector(".day-location-list");
        openModal();
      });
    });
  }

  // Function to open the modal
  function openModal() {
    modalLocationList.innerHTML = favoriteLocations
      .map(
        (location) => `
      <li>
        <label>
          <input type="checkbox" value="${location._id}">
          ${location.title}
        </label>
      </li>
    `
      )
      .join("");
    locationModal.style.display = "block";
  }

  // Function to close the modal
  function closeModal() {
    locationModal.style.display = "none";
  }

  modalClose.onclick = function () {
    closeModal();
  };

  window.onclick = function (event) {
    if (event.target == locationModal) {
      closeModal();
    }
  };

  saveSelectionButton.onclick = function () {
    const selectedLocations = Array.from(
      modalLocationList.querySelectorAll("input:checked")
    ).map((checkbox) => checkbox.value);
    selectedDayContainer.innerHTML = selectedLocations
      .map((id) => {
        const location = favoriteLocations.find((loc) => loc._id === id);
        return `<li>${location.title}</li>`;
      })
      .join("");
    closeModal();
  };

  // Function to load favorite locations
  async function loadFavoriteLocations() {
    try {
      const response = await fetch("/favorites", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login"; // Redirect to login page
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      favoriteLocations = await response.json();
    } catch (error) {
      console.error("Error fetching favorite locations:", error);
    }
  }

  // Save trip details
  async function saveTrip() {
    const tripData = {
      userId: localStorage.getItem("userId"),
      days: [],
    };

    document.querySelectorAll(".day-container").forEach((container) => {
      const dayNumber = container.id.replace("day-", "");
      const locations = Array.from(
        container.querySelector(".day-location-list").children
      )
        .map((child) => {
          const location = favoriteLocations.find(
            (loc) => loc.title === child.textContent
          );
          return location ? location._id : null;
        })
        .filter((id) => id);

      tripData.days.push({ dayNumber, locations });
    });

    console.log("Saving trip data:", tripData); // Log trip data for debugging

    try {
      const response = await fetch("/save-trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(tripData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert("Trip saved successfully!");
    } catch (error) {
      console.error("Error saving trip:", error);
    }
  }

  // Drag and drop logic for desktop
  function makeDroppable(element) {
    element.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    element.addEventListener("drop", (e) => {
      e.preventDefault();
      const locationId = e.dataTransfer.getData("text/plain");
      const locationItem = document.getElementById(locationId);

      const container = e.target.closest(".day-container");
      if (container && locationItem) {
        container.querySelector(".day-location-list").appendChild(locationItem);
      }
    });
  }

  function setupDragAndDrop() {
    document.querySelectorAll(".location").forEach((locationItem) => {
      locationItem.draggable = true;
      locationItem.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", e.target.id);
      });
    });

    document.querySelectorAll(".day-container").forEach((dayContainer) => {
      makeDroppable(dayContainer);
    });
  }

  generateDaysButton.addEventListener("click", () => {
    const numDays = parseInt(numDaysInput.value);
    if (numDays > 0) {
      generateDailyContainers(numDays);
      if (!isMobileDevice()) {
        setupDragAndDrop();
      }
    }
  });

  saveTripButton.addEventListener("click", saveTrip);

  loadFavoriteLocations();
});

function adjustForVisualViewport() {
  const filtrosBar = document.querySelector(".filtros-barra");
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);

  filtrosBar.style.height = `calc(var(--vh, 1vh) * 8)`;
  filtrosBar.style.bottom = `${window.visualViewport.offsetTop}px`;
}

window.visualViewport.addEventListener("resize", adjustForVisualViewport);
window.visualViewport.addEventListener("scroll", adjustForVisualViewport);

// Initial call
adjustForVisualViewport();
