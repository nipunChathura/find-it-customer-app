import type { Outlet } from '@/types/api';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Callout, type MapViewProps, Marker } from 'react-native-maps';

import { OutletMarkerCard } from './outlet-marker-card';
import { ThemedText } from './themed-text';

type OutletsMapProps = {
  outlets: Outlet[];
  initialRegion?: MapViewProps['initialRegion'];
  style?: MapViewProps['style'];
  /** Marker pin color (e.g. red for outlets) */
  pinColor?: string;
};

const OUTLET_MARKER_RED = '#E53935';

const DEFAULT_REGION = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/** Hide POIs (restaurants, hotels, etc.); keep roads and city/locality names only. */
const MAP_STYLE_MINIMAL = [
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

export function OutletsMap({ outlets, initialRegion, style, pinColor = OUTLET_MARKER_RED }: OutletsMapProps) {
  const mapRef = useRef<MapView>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  const region =
    initialRegion ??
    (outlets.length > 0
      ? {
          latitude: outlets[0].latitude,
          longitude: outlets[0].longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }
      : DEFAULT_REGION);

  const onMarkerPress = useCallback((outlet: Outlet) => {
    setSelectedOutlet(outlet);
  }, []);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton
        showsPointsOfInterest={false}
        showsBuildings={false}
        customMapStyle={MAP_STYLE_MINIMAL}
      >
        {outlets.length > 0 &&
          outlets.map((outlet) => (
            <Marker
              key={outlet.id}
              coordinate={{ latitude: outlet.latitude, longitude: outlet.longitude }}
              title={outlet.name}
              description={outlet.address || undefined}
              pinColor={pinColor}
              onPress={() => onMarkerPress(outlet)}
            />
          ))}
      </MapView>
      {selectedOutlet && (
        <View style={styles.cardContainer} pointerEvents="box-none">
          <OutletMarkerCard outlet={selectedOutlet} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
  },
  cardContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  calloutBox: {
    minWidth: 140,
    maxWidth: 220,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  calloutTitle: {
    fontSize: 14,
    color: '#111',
  },
  calloutAddress: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
});
