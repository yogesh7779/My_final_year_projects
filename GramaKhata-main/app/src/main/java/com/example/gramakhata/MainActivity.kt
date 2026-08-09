package com.example.gramakhata

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.gramakhata.ui.*
import com.example.gramakhata.ui.theme.GramaKhataTheme
import com.example.gramakhata.viewmodel.KhataViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GramaKhataTheme {
                val viewModel: KhataViewModel = viewModel()
                val isLoggedIn by viewModel.isLoggedIn.collectAsState()
                val navController = rememberNavController()

                if (!isLoggedIn) {
                    LoginScreen(onLoginSuccess = { viewModel.login() })
                } else {
                    NavHost(navController = navController, startDestination = "dashboard") {
                        composable("dashboard") {
                            DashboardScreen(
                                viewModel = viewModel,
                                onNavigateToCustomerDetail = { id ->
                                    navController.navigate("customer_detail/$id")
                                },
                                onNavigateToSettings = { navController.navigate("settings") },
                                onNavigateToProfile = { navController.navigate("profile") }
                            )
                        }
                        composable(
                            route = "customer_detail/{customerId}",
                            arguments = listOf(navArgument("customerId") { type = NavType.IntType })
                        ) { backStackEntry ->
                            val customerId = backStackEntry.arguments?.getInt("customerId") ?: 0
                            CustomerDetailScreen(
                                customerId = customerId,
                                viewModel = viewModel,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }
                        composable("settings") {
                            SettingsScreen(onNavigateBack = { navController.popBackStack() })
                        }
                        composable("profile") {
                            ProfileScreen(
                                viewModel = viewModel,
                                onNavigateBack = { navController.popBackStack() },
                                onLogout = { viewModel.logout() }
                            )
                        }
                    }
                }
            }
        }
    }
}
