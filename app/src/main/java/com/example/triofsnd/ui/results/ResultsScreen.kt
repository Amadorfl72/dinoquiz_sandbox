package com.example.triofsnd.ui.results

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ResultsScreen(
    score: Int = 0,
    onPlayAgain: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .testTag(ResultsScreenTestTags.RESULTS_ROOT),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Tu puntuación: $score/10",
            fontSize = 24.sp,
            modifier = Modifier
                .testTag(ResultsScreenTestTags.SCORE_TEXT)
                .padding(bottom = 32.dp)
        )
        
        Button(
            onClick = onPlayAgain,
            modifier = Modifier
                .testTag(ResultsScreenTestTags.VOLVER_A_JUGAR_BUTTON)
                .height(48.dp) // Fixed: Set explicit height to meet minimum touch target
                .padding(horizontal = 16.dp),
            colors = ButtonDefaults.buttonColors()
        ) {
            Text(
                text = "Volver a jugar",
                fontSize = 18.sp
            )
        }
    }
}