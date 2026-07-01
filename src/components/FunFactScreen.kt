package com.dinoquiz.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun FunFactScreen(funFact: String, dinosaurImageResId: Int, onNextClicked: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = funFact,
            fontSize = 20.sp,
            modifier = Modifier.testTag("funFactText")
        )
        Spacer(modifier = Modifier.height(16.dp))
        Image(
            painter = painterResource(id = dinosaurImageResId),
            contentDescription = "Dinosaur Image",
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .testTag("dinosaurImage")
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = onNextClicked,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .testTag("nextButton")
        ) {
            Text(text = "Next")
        }
    }
}