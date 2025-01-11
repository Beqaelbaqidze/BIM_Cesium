import { Cartographic, Cartesian3, PolygonHierarchy, Color, sampleTerrainMostDetailed, Entity } from "cesium";

export class ApartmentLoader {
  constructor(viewer, wfsUrl) {
    this.viewer = viewer;
    this.wfsUrl = wfsUrl;
  }

  async loadApartments() {
    try {
      const response = await fetch(this.wfsUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch WFS data: ${response.statusText}`);
      }

      const data = await response.json();
      const promises = [];

      data.features.forEach((feature) => {
        const geometry = feature.geometry;
        const floor = feature.properties.FLOOR || 1; // Default FLOOR to 1
        const height = 3; // Fixed height for apartments

        if (geometry.type === "Polygon") {
          promises.push(this.addApartment(geometry.coordinates, height, floor, feature.properties));
        } else if (geometry.type === "MultiPolygon") {
          geometry.coordinates.forEach((polygon) => {
            promises.push(this.addApartment(polygon, height, floor, feature.properties));
          });
        } else {
          console.error("Unsupported geometry type:", geometry.type);
        }
      });

      await Promise.all(promises);
      this.viewer.flyTo(this.viewer.entities);
    } catch (error) {
      console.error("Error loading WFS data:", error);
    }
  }

  async addApartment(coordinates, apartmentHeight, floor, properties) {
    const positions = coordinates[0].map((coord) => Cartographic.fromDegrees(coord[0], coord[1]));

    // Sample terrain height at the building outline
    const updatedPositions = await sampleTerrainMostDetailed(this.viewer.terrainProvider, positions);

    // Calculate the base height from the terrain height + floor offset
    const terrainHeight = Math.min(...updatedPositions.map((pos) => pos.height)); // Use minimum terrain height
    const baseHeight = terrainHeight + (floor - 1) * 3;

    // Convert positions to Cartesian3 with the calculated baseHeight
    const hierarchy = coordinates[0].map(([lon, lat]) =>
      Cartesian3.fromDegrees(lon, lat, baseHeight)
    );

    // Add apartment entity to the viewer
    this.viewer.entities.add(
      new Entity({
        polygon: {
          hierarchy: new PolygonHierarchy(hierarchy),
          material: Color.RED.withAlpha(0.5), // Apartment color with transparency
          perPositionHeight: false, // Use uniform height for all vertices
          height: baseHeight, // Set the base height to align with the floor
          extrudedHeight: baseHeight + apartmentHeight, // Extrude 3 meters above the base
          outline: true, // Enable outlines
          outlineColor: Color.BLACK, // Outline color
        },
        description: Object.entries(properties)
          .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
          .join("<br>"), // Apartment description
        properties,
      })
    );
  }
}
