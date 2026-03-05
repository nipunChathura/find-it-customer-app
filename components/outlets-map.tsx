import { Theme } from '@/constants/theme';
import type { Outlet } from '@/types/api';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { type MapViewProps, Marker } from 'react-native-maps';

import { OutletMarkerCard } from './outlet-marker-card';

type OutletsMapProps = {
  outlets: Outlet[];
  initialRegion?: MapViewProps['initialRegion'];
  style?: MapViewProps['style'];
  /** Marker pin color (e.g. Theme.primary for blue) */
  pinColor?: string;
};

const DEFAULT_REGION = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function OutletsMap({ outlets, initialRegion, style, pinColor = Theme.primary }: OutletsMapProps) {
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

  if (outlets.length === 0) return null;

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
      >
        {outlets.map((outlet) => (
          <Marker
            key={outlet.id}
            coordinate={{ latitude: outlet.latitude, longitude: outlet.longitude }}
            title={outlet.name}
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
});
