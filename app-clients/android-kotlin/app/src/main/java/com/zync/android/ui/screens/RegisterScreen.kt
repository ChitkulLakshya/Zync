package com.zync.android.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.zync.android.ui.components.CustomTextField
import com.zync.android.viewmodel.AuthViewModel

@Composable
fun RegisterScreen(viewModel: AuthViewModel) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("Create an Account", modifier = Modifier.padding(bottom = 32.dp))
        
        CustomTextField(value = name, onValueChange = { name = it }, label = "Full Name")
        Spacer(modifier = Modifier.height(16.dp))
        CustomTextField(value = email, onValueChange = { email = it }, label = "Email Address")
        Spacer(modifier = Modifier.height(16.dp))
        CustomTextField(value = password, onValueChange = { password = it }, label = "Password", visualTransformation = PasswordVisualTransformation())
        Spacer(modifier = Modifier.height(32.dp))

        Button(onClick = { /* TODO: Hook up to register */ }, modifier = Modifier.fillMaxWidth().height(50.dp)) {
            Text("Sign Up")
        }
    }
}
