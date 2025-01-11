import { Cartographic, Cartesian3, PolygonHierarchy, Color, sampleTerrainMostDetailed, Entity } from "cesium";

export class BuildingLoader {
  constructor(viewer, wfsUrl) {
    this.viewer = viewer;
    this.wfsUrl = wfsUrl;
  }

  async loadBuildings() {
    try {
      const response = await fetch(this.wfsUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch WFS data: ${response.statusText}`);
      }

      const data = await response.json();
      const promises = [];

      data.features.forEach((feature) => {
        const geometry = feature.geometry;
        const sartuli = feature.properties.SARTULI || 1; // Default SARTULI to 1
        const height = (sartuli * 3) + 3; // Building height

        if (geometry.type === "Polygon") {
          promises.push(this.addBuilding(geometry.coordinates, height, feature.properties));
        } else if (geometry.type === "MultiPolygon") {
          geometry.coordinates.forEach((polygon) => {
            promises.push(this.addBuilding(polygon, height, feature.properties));
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

  async addBuilding(coordinates, buildingHeight, properties) {
    const positions = coordinates[0].map((coord) => Cartographic.fromDegrees(coord[0], coord[1]));

    const updatedPositions = await sampleTerrainMostDetailed(this.viewer.terrainProvider, positions);

    const hierarchy = updatedPositions.map((pos) =>
      Cartesian3.fromRadians(pos.longitude, pos.latitude, pos.height)
    );

    const minHeight = Math.min(...updatedPositions.map((pos) => pos.height));
    const floorHeight = 3; // Each floor height
    const numFloors = buildingHeight / floorHeight; // Total number of floors

    for (let i = 0; i < numFloors; i++) {
      const currentMinHeight = minHeight + i * floorHeight;
      const currentMaxHeight = currentMinHeight + floorHeight;

      this.viewer.entities.add(
        new Entity({
          polygon: {
            hierarchy: new PolygonHierarchy(hierarchy),
            material: Color.BLUE.withAlpha(0.2),
            perPositionHeight: true,
            extrudedHeight: currentMaxHeight,
            outline: true,
            outlineColor: Color.BLACK,
          },
          description: Object.entries(properties)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join("<br>"),
          properties,
        })
      );
    }
  }
}
