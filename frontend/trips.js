document.addEventListener("DOMContentLoaded", () => {
  const tripsList = document.getElementById("trips-list");

  // Load user trips
  async function loadTrips() {
    try {
      const response = await fetch("/trips", {
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

      const trips = await response.json();
      console.log("Fetched trips:", trips); // Log fetched trips for debugging

      trips.forEach((trip) => {
        const tripItem = document.createElement("div");
        tripItem.className = "trip-item";
        tripItem.innerHTML = `
          <h3>Trip on ${new Date(trip.date).toLocaleDateString()}</h3>
          <p>Number of days: ${trip.days.length}</p>
          <div>
            ${trip.days
              .map(
                (day) => `
              <h4>Day ${day.dayNumber}</h4>
              <ul>
                ${day.locations
                  .map((location) => `<li>${location.title}</li>`)
                  .join("")}
              </ul>
            `
              )
              .join("")}
          </div>
        `;
        tripsList.appendChild(tripItem);
      });
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  }

  loadTrips();
});
