

import { Layout } from '@/constants/theme';
import type { Outlet } from '@/types/api';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

interface RouteMapProps {
  outlet: Outlet;
  style?: object;
}

export function RouteMap({ outlet, style }: RouteMapProps) {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {

      }
    })();
    return () => { cancelled = true; };
  }, []);

  const region = userLocation
    ? {
        latitude: (userLocation.latitude + outlet.latitude) / 2,
        longitude: (userLocation.longitude + outlet.longitude) / 2,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: outlet.latitude,
        longitude: outlet.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

  const coordinates = userLocation
    ? [userLocation, { latitude: outlet.latitude, longitude: outlet.longitude }]
    : [];

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton
        showsCompass={false}
        toolbarEnabled={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
      >
        <Marker coordinate={{ latitude: outlet.latitude, longitude: outlet.longitude }} title={outlet.name} />
        {coordinates.length === 2 && (
          <Polyline coordinates={coordinates} strokeColor={Layout.primary} strokeWidth={4} />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 200, borderRadius: 12, overflow: 'hidden' },
});
