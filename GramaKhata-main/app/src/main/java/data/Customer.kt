package com.example.gramakhata.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity
data class Customer(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val phoneNumber: String = "",
    val address: String = "",
    val totalDue: Int = 0,
    val lastTransactionDate: Long = System.currentTimeMillis(),
    val createdAt: Long = System.currentTimeMillis()
)
