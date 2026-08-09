package com.example.gramakhata.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [Customer::class, Transaction::class], version = 2, exportSchema = false)
abstract class KhataDatabase : RoomDatabase() {
    abstract fun dao(): KhataDao
}