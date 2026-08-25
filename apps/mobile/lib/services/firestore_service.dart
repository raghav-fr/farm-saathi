import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:uuid/uuid.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final Uuid _uuid = const Uuid();

  String? get currentUserId => _auth.currentUser?.uid;

  // --- Farms ---
  Stream<List<Map<String, dynamic>>> streamFarms() {
    final uid = currentUserId;
    if (uid == null) return Stream.value([]);
    
    return _db
        .collection('farmers')
        .doc(uid)
        .collection('farms')
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => doc.data()).toList());
  }

  Future<List<Map<String, dynamic>>> getFarmsOnce() async {
    final uid = currentUserId;
    if (uid == null) return [];
    
    final snapshot = await _db
        .collection('farmers')
        .doc(uid)
        .collection('farms')
        .get();
        
    return snapshot.docs.map((doc) => doc.data()).toList();
  }

  Future<Map<String, dynamic>> addFarm(Map<String, dynamic> data) async {
    final uid = currentUserId;
    if (uid == null) throw Exception('User not logged in');

    final farmId = _uuid.v4();
    final now = DateTime.now().toUtc().toIso8601String();
    
    final farmData = {
      'id': farmId,
      'userId': uid,
      'createdAt': now,
      'updatedAt': now,
      ...data,
    };

    // Fire and forget: Firestore handles local caching and background sync when online
    _db
        .collection('farmers')
        .doc(uid)
        .collection('farms')
        .doc(farmId)
        .set(farmData).catchError((e) => print('Background sync error: $e'));
        
    return farmData;
  }

  Future<void> updateFarm(String farmId, Map<String, dynamic> data) async {
    final uid = currentUserId;
    if (uid == null) throw Exception('User not logged in');

    data['updatedAt'] = DateTime.now().toUtc().toIso8601String();
    
    _db
        .collection('farmers')
        .doc(uid)
        .collection('farms')
        .doc(farmId)
        .update(data).catchError((e) => print('Background sync error: $e'));
  }

  Future<void> deleteFarm(String farmId) async {
    final uid = currentUserId;
    if (uid == null) throw Exception('User not logged in');

    _db
        .collection('farmers')
        .doc(uid)
        .collection('farms')
        .doc(farmId)
        .delete().catchError((e) => print('Background sync error: $e'));
  }

  // --- Crops ---
  Stream<List<Map<String, dynamic>>> streamCrops(String farmId) {
    final uid = currentUserId;
    if (uid == null) return Stream.value([]);
    
    return _db
        .collection('farmers')
        .doc(uid)
        .collection('farms')
        .doc(farmId)
        .collection('crops')
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => doc.data()).toList());
  }

  Future<Map<String, dynamic>> addCrop(String farmId, Map<String, dynamic> data) async {
    final uid = currentUserId;
    if (uid == null) throw Exception('User not logged in');

    final cropId = _uuid.v4();
    final now = DateTime.now().toUtc().toIso8601String();
    
    final cropData = {
      'id': cropId,
      'farmId': farmId,
      'userId': uid,
      'createdAt': now,
      'updatedAt': now,
      ...data,
    };

    _db
        .collection('farmers')
        .doc(uid)
        .collection('farms')
        .doc(farmId)
        .collection('crops')
        .doc(cropId)
        .set(cropData).catchError((e) => print('Background sync error: $e'));
        
    return cropData;
  }

  Future<void> updateCrop(String farmId, String cropId, Map<String, dynamic> data) async {
    final uid = currentUserId;
    if (uid == null) throw Exception('User not logged in');

    data['updatedAt'] = DateTime.now().toUtc().toIso8601String();
    
    _db
        .collection('farmers')
        .doc(uid)
        .collection('farms')
        .doc(farmId)
        .collection('crops')
        .doc(cropId)
        .update(data).catchError((e) => print('Background sync error: $e'));
  }

  Future<void> deleteCrop(String farmId, String cropId) async {
    final uid = currentUserId;
    if (uid == null) throw Exception('User not logged in');

    _db
        .collection('farmers')
        .doc(uid)
        .collection('farms')
        .doc(farmId)
        .collection('crops')
        .doc(cropId)
        .delete().catchError((e) => print('Background sync error: $e'));
  }
}
