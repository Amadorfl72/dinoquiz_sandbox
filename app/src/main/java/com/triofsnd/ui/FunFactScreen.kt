package com.triofsnd.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun FunFactScreen(
    state: FunFactScreenState
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.dinosaur_image),
                contentDescription = "Dinosaur",
                modifier = Modifier.size(200.dp)
            )
            
            Text(
                text = state.fact,
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center
            )
        }
        
        Button(
            onClick = state.onNext,
            modifier = Modifier
                .height(48.dp)
                .fillMaxWidth()
        ) {
            Text("Next")
        }
    }
}

data class FunFactScreenState(
    val fact: String,
    val onNext: () -> Unit
)