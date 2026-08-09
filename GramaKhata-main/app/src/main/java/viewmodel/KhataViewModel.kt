package com.example.gramakhata.viewmodel

import android.app.Application
import androidx.lifecycle.*
import androidx.room.Room
import com.example.gramakhata.data.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class KhataViewModel(application: Application) : AndroidViewModel(application) {

    private val db = Room.databaseBuilder(
        application,
        KhataDatabase::class.java,
        "khata_db"
    )
    .fallbackToDestructiveMigration() // For development simplicity
    .build()

    private val dao = db.dao()

    val customers: Flow<List<Customer>> = dao.getCustomers()
    val recentTransactions: Flow<List<Transaction>> = dao.getAllRecentTransactions()

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    fun login() {
        _isLoggedIn.value = true
    }

    fun logout() {
        _isLoggedIn.value = false
    }

    fun addCustomer(name: String, phoneNumber: String, address: String) {
        viewModelScope.launch {
            dao.insertCustomer(Customer(name = name, phoneNumber = phoneNumber, address = address))
        }
    }

    fun addTransaction(customer: Customer, amount: Int, type: String, note: String) {
        viewModelScope.launch {
            val timestamp = System.currentTimeMillis()
            dao.insertTransaction(
                Transaction(customerId = customer.id, amount = amount, type = type, note = note, timestamp = timestamp)
            )

            val newDue = if (type == "CREDIT") {
                customer.totalDue + amount
            } else {
                customer.totalDue - amount
            }

            dao.updateDue(customer.id, newDue, timestamp)
        }
    }

    fun getTransactionsForCustomer(customerId: Int): Flow<List<Transaction>> {
        return dao.getTransactionsForCustomer(customerId)
    }
}
