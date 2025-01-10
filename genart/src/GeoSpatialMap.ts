// import { point, featureCollection, nearestPoint } from '@turf/turf'

// function findNearestPoints(points, referencePoint, maxDistance) {
//   // Convert the points to a GeoJSON FeatureCollection
//   const featureCol = featureCollection(points.map((p) => point([p.x, p.y])))
//   const referenceFeature = point([referencePoint.x, referencePoint.y])

//   // Use turf's `turf.pointsWithinDistance` to find nearby points within the maxDistance
//   const nearestPoints = nearestPoint(
//     referenceFeature,
//     featureCollection,
//     maxDistance,
//   )

//   // Return the points as simple objects
//   return nearestPoints.features.map((f) => ({
//     x: f.geometry.coordinates[0],
//     y: f.geometry.coordinates[1],
//   }))
// }
