document.addEventListener("DOMContentLoaded", () => {
  const numDaysInput = document.getElementById("num-days");
  const generateDaysButton = document.getElementById("generate-days");
  const tripPlanner = document.getElementById("trip-planner");
  const saveTripButton = document.getElementById("save-trip");

  let favoriteLocations = [];
  let tripData = {
    userId: localStorage.getItem("userId"),
    days: [],
  };

  let map;
  let markers;

  async function fetchFavoriteLocations() {
    try {
      const response = await fetch("/favorites", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      favoriteLocations = await response.json();
      console.log("Fetched favorite locations:", favoriteLocations);
      renderMap(favoriteLocations);
    } catch (error) {
      console.error("Error fetching favorite locations:", error);
    }
  }

  function renderMap(locations) {
    map = L.map("map").setView([41.744, -8.519], 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    markers = L.markerClusterGroup();

    locations.forEach((location) => {
      if (location.latitude && location.longitude) {
        const marker = L.marker([
          location.latitude,
          location.longitude,
        ]).bindPopup(getPopupContent(location));
        marker.locationData = location;
        markers.addLayer(marker);
      }
    });

    map.addLayer(markers);
  }

  function getPopupContent(location) {
    const container = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = location.title;
    const description = document.createElement("p");
    description.textContent = location.description || "";

    const daySelector = document.createElement("select");
    daySelector.className = "day-selector";
    updateDayOptions(daySelector);

    const addButton = document.createElement("button");
    addButton.textContent = "Add to Day";
    addButton.onclick = () => {
      const selectedDay = parseInt(daySelector.value);
      if (!isNaN(selectedDay)) {
        addToDay(location, selectedDay);
      }
    };

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(daySelector);
    container.appendChild(addButton);

    return container;
  }

  function updateDayOptions(selectElement) {
    const numDays = parseInt(numDaysInput.value);
    let options = '<option value="">Select a day</option>';
    for (let i = 1; i <= numDays; i++) {
      options += `<option value="${i}">Day ${i}</option>`;
    }
    selectElement.innerHTML = options;
  }

  function addToDay(location, day) {
    if (!tripData.days[day - 1]) {
      tripData.days[day - 1] = { dayNumber: day, locations: [] };
    }
    if (!tripData.days[day - 1].locations.includes(location._id)) {
      tripData.days[day - 1].locations.push(location._id);
      console.log(`Location ${location.title} added to Day ${day}`);
      updateDayContainer(day);
    }
  }

  function updateDayContainer(day) {
    const dayContainer = document.getElementById(`day-${day}`);
    if (dayContainer) {
      const locationList = dayContainer.querySelector(".day-location-list");
      locationList.innerHTML = "";
      tripData.days[day - 1].locations.forEach((locationId) => {
        const location = favoriteLocations.find(
          (loc) => loc._id === locationId
        );
        if (location) {
          const listItem = document.createElement("li");
          listItem.textContent = location.title;
          listItem.draggable = true;
          listItem.addEventListener("dragstart", (event) => {
            event.dataTransfer.setData("text/plain", JSON.stringify(location));
          });
          const removeButton = document.createElement("button");
          removeButton.textContent = "Remove";
          removeButton.onclick = () => removeFromDay(location, day);
          listItem.appendChild(removeButton);
          locationList.appendChild(listItem);
        }
      });
    }
  }

  function removeFromDay(location, day) {
    const dayData = tripData.days[day - 1];
    if (dayData) {
      dayData.locations = dayData.locations.filter((id) => id !== location._id);
      updateDayContainer(day);
    }
  }

  function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.textContent);
  }

  function allowDrop(ev) {
    ev.preventDefault();
  }

  function drop(ev, day) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const location = favoriteLocations.find(
      (loc) => loc.title === data.split("Remove")[0].trim()
    );
    if (location) {
      addToDay(location, day);
    }
  }

  async function saveTrip() {
    console.log("Saving trip data:", tripData);

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
      alert("Failed to save trip. Please try again.");
    }
  }

  function generateDailyContainers(numDays) {
    tripPlanner.innerHTML = "";

    for (let i = 1; i <= numDays; i++) {
      const dayContainer = document.createElement("div");
      dayContainer.className = "day-container";
      dayContainer.id = `day-${i}`;
      dayContainer.innerHTML = `
        <h3>Day ${i}</h3>
        <ul class="day-location-list"></ul>
      `;
      tripPlanner.appendChild(dayContainer);

      const locationList = dayContainer.querySelector(".day-location-list");
      locationList.addEventListener("dragover", allowDrop);
      locationList.addEventListener("drop", (event) => drop(event, i));
    }
  }

  generateDaysButton.addEventListener("click", () => {
    const numDays = parseInt(numDaysInput.value);
    if (numDays > 0) {
      tripData.days = Array.from({ length: numDays }, (_, i) => ({
        dayNumber: i + 1,
        locations: [],
      }));
      generateDailyContainers(numDays);
      console.log("Generated daily containers for days:", numDays);

      markers.eachLayer((marker) => {
        const popup = marker.getPopup();
        const content = popup.getContent();
        const newContent = getPopupContent(marker.locationData);
        popup.setContent(newContent);
      });
    }
  });

  saveTripButton.addEventListener("click", saveTrip);

  fetchFavoriteLocations();
});
