package com.example.gramakhata.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity
data class Transaction(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val customerId: Int,
    val amount: Int,
    val type: String, // "CREDIT" or "DEBIT"
    val note: String = "",
    val timestamp: Long = System.currentTimeMillis()
)
