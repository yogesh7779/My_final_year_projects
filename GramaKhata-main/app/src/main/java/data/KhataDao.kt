package com.example.gramakhata.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface KhataDao {

    @Insert
    suspend fun insertCustomer(customer: Customer)

    @Update
    suspend fun updateCustomer(customer: Customer)

    @Delete
    suspend fun deleteCustomer(customer: Customer)

    @Insert
    suspend fun insertTransaction(transaction: Transaction)

    @Query("SELECT * FROM Customer ORDER BY name ASC")
    fun getCustomers(): Flow<List<Customer>>

    @Query("SELECT * FROM Customer WHERE id = :id")
    suspend fun getCustomerById(id: Int): Customer?

    @Query("SELECT * FROM `Transaction` WHERE customerId = :customerId ORDER BY timestamp DESC")
    fun getTransactionsForCustomer(customerId: Int): Flow<List<Transaction>>

    @Query("SELECT * FROM `Transaction` ORDER BY timestamp DESC LIMIT 50")
    fun getAllRecentTransactions(): Flow<List<Transaction>>

    @Query("UPDATE Customer SET totalDue = :amount, lastTransactionDate = :date WHERE id = :id")
    suspend fun updateDue(id: Int, amount: Int, date: Long)
}
