package com.example.triofsnd

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun volverAJugarButton_height_isAtLeast48dp() {
        composeTestRule.setContent {
            ResultsScreen()
        }

        composeTestRule
            .onNodeWithText("Volver a jugar")
            .assertHeightIsAtLeast(48.dp)
    }
}
