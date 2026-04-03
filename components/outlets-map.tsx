import type { Outlet } from '@/types/api';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { type MapViewProps, Marker } from 'react-native-maps';

import { OutletMarkerCard } from './outlet-marker-card';

type OutletsMapProps = {
  outlets: Outlet[];
  initialRegion?: MapViewProps['initialRegion'];
  style?: MapViewProps['style'];
  
  pinColor?: string;
};

const OUTLET_MARKER_RED = '#E53935';

const DEFAULT_REGION = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};


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

  const onMapPress = useCallback(
    (e: { nativeEvent: { action?: 'press' | 'marker-press' } }) => {
      if (e.nativeEvent.action === 'marker-press') return;
      setSelectedOutlet(null);
    },
    []
  );

  const clearSelectedOutlet = useCallback(() => {
    setSelectedOutlet(null);
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
        showsCompass={false}
        toolbarEnabled={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        customMapStyle={MAP_STYLE_MINIMAL}
        onPress={onMapPress}
      >
        {outlets.length > 0 &&
          outlets.map((outlet) => (
            <Marker
              key={outlet.id}
              coordinate={{ latitude: outlet.latitude, longitude: outlet.longitude }}
              pinColor={pinColor}
              onPress={() => onMarkerPress(outlet)}
              accessibilityLabel={outlet.name}
            />
          ))}
      </MapView>
      {selectedOutlet && (
        <View style={styles.cardContainer} pointerEvents="box-none">
          <OutletMarkerCard outlet={selectedOutlet} onClose={clearSelectedOutlet} />
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
