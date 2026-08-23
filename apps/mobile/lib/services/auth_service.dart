import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  User? _user;
  Map<String, dynamic>? _farmerProfile;

  User? get currentUser => _user;
  Map<String, dynamic>? get farmerProfile => _farmerProfile;
  bool get isAuthenticated => _user != null;
  bool get needsOnboarding => _user != null && _farmerProfile == null;

  AuthService() {
    _auth.authStateChanges().listen((User? user) async {
      _user = user;
      if (user != null) {
        await fetchFarmerProfile();
      } else {
        _farmerProfile = null;
      }
      notifyListeners();
    });
  }

  Future<void> fetchFarmerProfile() async {
    try {
      final api = ApiService();
      _farmerProfile = await api.getMe();
    } catch (e) {
      // 404 or other error means profile doesn't exist yet
      _farmerProfile = null;
    }
    notifyListeners();
  }

  Future<void> signInWithEmail(String email, String password) async {
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
    } catch (e) {
      throw Exception('Login failed: $e');
    }
  }

  Future<void> registerWithEmail(String email, String password) async {
    try {
      await _auth.createUserWithEmailAndPassword(email: email, password: password);
    } catch (e) {
      throw Exception('Registration failed: $e');
    }
  }

  Future<void> signInWithGoogle() async {
    try {
      // Must initialize first in v7+
      // Actually wait, initialize() is needed: 
      // await GoogleSignIn.instance.initialize(); // If it's a future?
      
      // I'll try normal GoogleSignIn.instance.authenticate() first
      await GoogleSignIn.instance.initialize();
      final GoogleSignInAccount googleUser = await GoogleSignIn.instance.authenticate();
      if (googleUser == null) {
        return; // The user canceled the sign-in
      }

      final GoogleSignInAuthentication googleAuth = googleUser.authentication;
      final AuthCredential credential = GoogleAuthProvider.credential(
        idToken: googleAuth.idToken,
      );

      await _auth.signInWithCredential(credential);
    } catch (e) {
      throw Exception('Google Sign-In failed: $e');
    }
  }

  Future<void> signOut() async {
    await GoogleSignIn.instance.signOut();
    await _auth.signOut();
  }
}
