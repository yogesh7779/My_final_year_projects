package com.example.gramakhata.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.gramakhata.data.Customer
import com.example.gramakhata.data.Transaction
import com.example.gramakhata.viewmodel.KhataViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerDetailScreen(
    customerId: Int,
    viewModel: KhataViewModel,
    onNavigateBack: () -> Unit
) {
    val customers by viewModel.customers.collectAsState(initial = emptyList())
    val customer = customers.find { it.id == customerId }
    val transactions by viewModel.getTransactionsForCustomer(customerId).collectAsState(initial = emptyList())

    var showAddTransactionDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(customer?.name ?: "Customer Detail") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddTransactionDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add Transaction")
            }
        }
    ) { padding ->
        if (customer == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Customer not found")
            }
        } else {
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
            ) {
                CustomerInfoSection(customer)
                
                HorizontalDivider()
                
                Text(
                    text = "Transaction History",
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(transactions) { transaction ->
                        TransactionDashboardItem(transaction = transaction) // Reuse from Dashboard
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    }
                }
            }
        }
    }

    if (showAddTransactionDialog && customer != null) {
        AddTransactionDialog(
            onDismiss = { showAddTransactionDialog = false },
            onConfirm = { amount, type, note ->
                viewModel.addTransaction(customer, amount, type, note)
                showAddTransactionDialog = false
            }
        )
    }
}

@Composable
fun CustomerInfoSection(customer: Customer) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(text = customer.phoneNumber, style = MaterialTheme.typography.bodyLarge)
            }
            Spacer(Modifier.height(8.dp))
            Text(text = "Address: ${customer.address}", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "Total Due:", fontWeight = FontWeight.Bold)
                Text(
                    text = "₹ ${customer.totalDue}",
                    fontWeight = FontWeight.Bold,
                    color = if (customer.totalDue > 0) Color(0xFFD32F2F) else Color(0xFF388E3C),
                    style = MaterialTheme.typography.titleLarge
                )
            }
        }
    }
}

@Composable
fun AddTransactionDialog(
    onDismiss: () -> Unit,
    onConfirm: (Int, String, String) -> Unit
) {
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("CREDIT") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Transaction") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Amount") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Note") },
                    modifier = Modifier.fillMaxWidth()
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = type == "CREDIT", onClick = { type = "CREDIT" })
                    Text("Credit")
                    Spacer(Modifier.width(16.dp))
                    RadioButton(selected = type == "DEBIT", onClick = { type = "DEBIT" })
                    Text("Debit")
                }
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(amount.toIntOrNull() ?: 0, type, note) }) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
