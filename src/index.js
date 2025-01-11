import './styles.css';

import {
  Ion,
  Viewer,
  createWorldTerrainAsync,
  Cartographic,
  Cartesian3,
  PolygonHierarchy,
  Color,
  sampleTerrainMostDetailed,
  Entity,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Set the base URL for Cesium assets
window.CESIUM_BASE_URL = "/static/Cesium/";

// Set your Cesium Ion access token
Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5YzYxNGM1Yy0wZjU0LTRkZWEtYTZhMy04NGRkM2Q3Y2EwM2MiLCJpZCI6MjAxOTE1LCJpYXQiOjE3MTA0MTQxNjJ9.ESJo3qUQ0CIMEgeSHMDIUHeZEGo5yUFnP5XMut8OU2o";

// Initialize the Cesium Viewer
const viewer = new Viewer("cesiumContainer", {
  scene3DOnly: true,
  shadows: true,
});

// Load terrain asynchronously
createWorldTerrainAsync()
  .then((terrainProvider) => {
    viewer.terrainProvider = terrainProvider; // Set the terrain provider
    loadGeoJsonData(viewer); // Load GeoJSON data
  })
  .catch((error) => console.error("Error loading terrain:", error));

// Fetch and process GeoJSON data
function loadGeoJsonData(viewer) {
  const wfsUrl =
    "http://localhost:8080/geoserver/Georeference/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Georeference%3Ashenoba&outputFormat=application/json&maxFeatures=50&srsName=EPSG:4326";

  fetch(wfsUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch WFS data: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      const promises = [];

      data.features.forEach((feature) => {
        const geometry = feature.geometry;
        const sartuli = feature.properties.SARTULI || 1; // Default SARTULI to 1
        const height = sartuli * 3; // Building height

        if (geometry.type === "Polygon") {
          promises.push(addBuildingToTerrain(viewer, geometry.coordinates, height, feature.properties));
        } else if (geometry.type === "MultiPolygon") {
          geometry.coordinates.forEach((polygon) => {
            promises.push(addBuildingToTerrain(viewer, polygon, height, feature.properties));
          });
        } else {
          console.error("Unsupported geometry type:", geometry.type);
        }
      });

      // Fly to all entities after processing
      Promise.all(promises).then(() => viewer.flyTo(viewer.entities));
    })
    .catch((error) => console.error("Error loading WFS data:", error));
}

// Add a building with terrain-aligned base and height, and include properties
function addBuildingToTerrain(viewer, coordinates, buildingHeight, properties) {
  const positions = coordinates[0].map((coord) => Cartographic.fromDegrees(coord[0], coord[1]));

  return sampleTerrainMostDetailed(viewer.terrainProvider, positions).then((updatedPositions) => {
    const baseHeights = updatedPositions.map((pos) => pos.height);
    const minHeight = Math.min(...baseHeights); // Terrain base height
    const floorHeight = 3; // Height of each SARTULI (floor)
    const numFloors = properties.SARTULI || 1; // Default SARTULI to 1

    const hierarchy = updatedPositions.map((pos) =>
      Cartesian3.fromRadians(pos.longitude, pos.latitude, pos.height)
    );

    for (let i = 0; i < numFloors; i++) {
      const floorMinHeight = minHeight + i * floorHeight;
      const floorMaxHeight = floorMinHeight + floorHeight;

      viewer.entities.add(
        new Entity({
          polygon: {
            hierarchy: new PolygonHierarchy(hierarchy),
            material: Color.BLUE.withAlpha(0.2), // Fill color with transparency
            height: floorMinHeight, // Start at this floor's base height
            extrudedHeight: floorMaxHeight, // End at this floor's top height
            perPositionHeight: false, // Ensure uniform base height
            outline: true, // Enable outlines
            outlineColor: Color.BLACK, // Set outline color
          },
          description: Object.entries(properties)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join("<br>"), // Description for the entity
          properties, // Attach properties for custom access
        })
      );
    }
  });
}



// Add a click handler to show attributes
viewer.screenSpaceEventHandler.setInputAction((event) => {
  const pickedObject = viewer.scene.pick(event.position);

  if (pickedObject && pickedObject.id && pickedObject.id.description) {
    // Show the feature attributes in Cesium's info box
    viewer.selectedEntity = pickedObject.id;
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);