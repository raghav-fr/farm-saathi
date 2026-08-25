import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:flutter/foundation.dart';

class LocationService extends ChangeNotifier {
  Position? _currentPosition;
  bool _isLoading = false;
  String? _error;

  StreamSubscription<Position>? _positionStream;

  Position? get currentPosition => _currentPosition;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<bool> handleLocationPermission() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _error = 'Location services are disabled. Please enable the services';
      notifyListeners();
      return false;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _error = 'Location permissions are denied';
        notifyListeners();
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      _error = 'Location permissions are permanently denied, we cannot request permissions.';
      notifyListeners();
      return false;
    }

    return true;
  }

  Future<void> startLiveTracking() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final hasPermission = await handleLocationPermission();
      if (!hasPermission) {
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Fetch initial location quickly
      _currentPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      // Start live stream, update every 2000 meters (2km)
      _positionStream?.cancel();
      _positionStream = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 2000,
        ),
      ).listen((Position position) {
        _currentPosition = position;
        notifyListeners();
      }, onError: (e) {
        _error = e.toString();
        notifyListeners();
      });

    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    super.dispose();
  }
}
