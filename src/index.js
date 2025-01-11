import './styles.css';
import { Viewer, createWorldTerrainAsync, ScreenSpaceEventType } from "cesium";
import { BuildingLoader } from "./building.class.js";
import { ApartmentLoader } from "./apartment.class.js";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Set Cesium base URL
window.CESIUM_BASE_URL = "/static/Cesium/";

// Cesium Viewer
const viewer = new Viewer("cesiumContainer", {
  scene3DOnly: true,
  shadows: true,
});

// Load terrain
createWorldTerrainAsync()
  .then((terrainProvider) => {
    viewer.terrainProvider = terrainProvider;

    // Load buildings
    const buildingLoader = new BuildingLoader(
      viewer,
      "http://localhost:8080/geoserver/THREEDBIM/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=THREEDBIM%3Ashenoba&outputFormat=application%2Fjson&srsName=EPSG:4326"
    );
    buildingLoader.loadBuildings();

    // Load apartments
    const apartmentLoader = new ApartmentLoader(
      viewer,
      "http://localhost:8080/geoserver/THREEDBIM/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=THREEDBIM%3Aunit_poligon&outputFormat=application%2Fjson&srsName=EPSG:4326"
    );
    apartmentLoader.loadApartments();
  })
  .catch((error) => console.error("Error loading terrain:", error));

// Click handler to show attributes
viewer.screenSpaceEventHandler.setInputAction((event) => {
  const pickedObject = viewer.scene.pick(event.position);

  if (pickedObject && pickedObject.id && pickedObject.id.description) {
    viewer.selectedEntity = pickedObject.id;
  }
}, ScreenSpaceEventType.LEFT_CLICK);
