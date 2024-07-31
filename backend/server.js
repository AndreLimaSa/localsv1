const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const path = require("path");
const app = express();
require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.PORT || 3000;
// MongoDB URI (using a single database with two collections)
const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb+srv://andrelimasa21:SuperKika21@cluster0.2rqcus1.mongodb.net/locationsdb?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
mongoose.connect(mongoUri, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Define Schema for Location
const locationSchema = new mongoose.Schema({
  src: String,
  title: String,
  description: String,
  typeicon: String,
  types: [String],
  latitude: Number,
  longitude: Number,
  url: String,
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
});

// Define the Location model
const Location = mongoose.model("Location", locationSchema);

// Define Schema for User
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Location" }],
});

userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    user.password = hashedPassword;
    next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ _id: this._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
};

// Define the User model
const User = mongoose.model("User", userSchema);
module.exports = User;

// Define Schema for Trip
const tripSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, default: Date.now },
  days: [
    {
      dayNumber: Number,
      locations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Location" }],
    },
  ],
});

// Define the Trip model
const Trip = mongoose.model("Trip", tripSchema);

module.exports = { Location, User, Trip };

// Routes
app.get("/locations", async (req, res) => {
  try {
    const locations = await Location.find({});
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/locations/:locationId/like", async (req, res) => {
  try {
    const location = await Location.findById(req.params.locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    location.likes += 1;
    await location.save();
    res
      .status(200)
      .json({ likes: location.likes, dislikes: location.dislikes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/locations/:locationId/dislike", async (req, res) => {
  try {
    const location = await Location.findById(req.params.locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    location.dislikes += 1;
    await location.save();
    res
      .status(200)
      .json({ likes: location.likes, dislikes: location.dislikes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Serve static files from the 'frontend' directory
app.use(express.static(path.join(__dirname, "../frontend")));

app.use(
  "/frontend/img",
  express.static(path.join(__dirname, "../frontend", "img"))
);

app.use(
  "/node_modules",
  express.static(path.join(__dirname, "../node_modules"))
);

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "register.html"));
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email already exists. Please choose another." });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();
    res.redirect("/login");
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to register user. Please try again later." });
  }
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "login.html"));
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = user.generateAuthToken();
    res.status(200).json({ token, userId: user._id }); // Include userId in the response
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to login. Please try again later." });
  }
});

function auth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send("Forbidden");
    }
    req.user = user;
    next();
  });
}

app.get("/favorites.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/favorites.html")); // Adjust the path to your frontend folder
});

app.get("/favorites", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate({
      path: "favorites",
      model: Location,
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.status(200).json(user.favorites);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.post("/favorites/:locationId", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const locationId = req.params.locationId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (user.favorites.includes(locationId)) {
      return res.status(400).send("Location already in favorites");
    }

    user.favorites.push(locationId);
    await user.save();

    res.status(200).json({ message: "Location saved to favorites" });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.delete("/favorites/:locationId", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const locationId = req.params.locationId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    user.favorites.pull(locationId);
    await user.save();

    res.status(200).json({ message: "Location removed from favorites" });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.get("/trip.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/trip.html")); // Adjust the path to your frontend folder
});

app.get("/tripplan.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/tripplan.html")); // Adjust the path to your frontend folder
});

app.get("/trips.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/trips.html")); // Adjust the path to your frontend folder
});

app.post("/save-trip", auth, async (req, res) => {
  try {
    const { userId, days } = req.body;

    if (!userId || !days || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: "Invalid trip data" });
    }

    const trip = new Trip({
      userId,
      days,
    });

    await trip.save();
    res.status(200).json({ message: "Trip saved successfully" });
  } catch (error) {
    console.error("Error saving trip:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to get all trips for the authenticated user
app.get("/trips", auth, async (req, res) => {
  try {
    const userId = req.user._id; // Assuming `req.user` contains the authenticated user info
    const trips = await Trip.find({ userId }).populate("days.locations");
    res.json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
